import React, { useEffect, useReducer, useState } from "react";
import classnames from 'classnames'
import useAnimation from "./hooks/useAnimation";
import "./App.css";

const BuildingStats = {
  timeBetweenFloors: 1000, // Travel time from one floor to the next
  stopDelay: 2000, // Time elevator waits on each floor without interruption before continuing
  stops: [
    { name: "Penthouse" },
    { name: "Third Floor" },
    { name: "Second Floor" },
    { name: "Ground Floor" },
    { name: "Basement" }
  ]
};

function HighlightButton({
  onClick, 
  children, 
  className, 
  shouldToggleHighlight
}) {
  const [isHighlighted, setHighlighted] = useState(false);
  const classNames = classnames(
    'highlight-button', 
    className,
    {
      'highlight-button--is-active': isHighlighted
    }
  );

  useEffect(() => {
    if(shouldToggleHighlight()) {
      setHighlighted(false);
    }
  })

  return (
    <button
      className={classNames}
      onClick={() => {
        setHighlighted(true);
        onClick()
      }}
    >
      {children}
    </button>
  );
}

const calculateElevatorPosition = idx => 30 * idx + 10 * idx - idx * 2;

function CarControls({ children }) {
  return (
    <div className="car-controls">
      <h2>Car Controls</h2>
      {children}
    </div>
  );
}

const selectors = {
  hasQueuedStops: state => state.stopQueue.length > 0
};

function Car({ position }) {
  return (
    <div
      className="elevator-car"
      style={{
        top: position
      }}
    />
  );
}

function TransitioningCar({ startIndex, endIndex, onComplete }) {
  const startPostion = calculateElevatorPosition(startIndex);
  const endPosition = calculateElevatorPosition(endIndex);
  const delta = endPosition - startPostion;


  const animationTime = Math.abs(BuildingStats.timeBetweenFloors * (endIndex - startIndex))
  const animationProgress = useAnimation("inOutSine", animationTime, 0);
  const position = startPostion + delta * animationProgress;

  useEffect(() => {
    if(position === endPosition) { onComplete() }
  })

  return <Car position={position} />;
}

let waitTimeout;

function ElevatorCar(props) {
  const { stopQueue, currentStopIdx, dispatch, state } = props;
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [ endIndex ] = stopQueue;

  function onTransitionComplete() {
    dispatch({ type: 'CAR_TRANSITION_COMPLETE' })
    waitTimeout = setTimeout(() => dispatch({ type: 'DISEMBARK_COMPLETE' }), BuildingStats.stopDelay)
    setIsTransitioning(false);
  }


  useEffect(() => {
    if (state === 'MOVING') {
      setIsTransitioning(true);
    }
  });

  return isTransitioning 
    ? (
      <TransitioningCar 
        startIndex={currentStopIdx} 
        endIndex={endIndex}
        onComplete={onTransitionComplete}
      />
    )
    : <Car position={calculateElevatorPosition(currentStopIdx)} />;
}

const initialState = {
  stopQueue: [],
  currentStopIdx: (BuildingStats.stops.length - 2),
  state: "IDLE"
};




function sortQueue(stopQueue, currentStopIdx) {
  const { above, below } = stopQueue.reduce(
    (acc, item) => {
      const whichList = item <= currentStopIdx ? 'above' : 'below';
      acc[whichList].push(item)
      return acc;
    },
    {above: [], below: []}
  );

  const sortedStopQueue = [ ...below.sort(),  ...above.sort((a, b) => b-a) ]
  console.log({
    stopQueue,
    sortedStopQueue
  })
  return sortedStopQueue
}



function reducer(state, action) {
  console.log({state, action})
  switch (action.type) {
    case "PRESS_CALL_BUTTON":
      return action.stopIndex === state.currentStopIdx && state.state !== 'MOVING'
        ? state
        : {
          ...state,
          stopQueue: sortQueue([...state.stopQueue, action.stopIndex], state.currentStopIdx),
          state: state.state === 'IDLE' ? 'MOVING' : state.state
        };
    case "CAR_TRANSITION_COMPLETE":
      const [ newIndex, ...restOfQueue ] = state.stopQueue
      return {
        ...state,
        stopQueue: restOfQueue,
        currentStopIdx: newIndex,
        state: 'WAITING_FOR_DISEMBARK'
      };

    case "DISEMBARK_COMPLETE":
      const nextState = selectors.hasQueuedStops(state) ? 'MOVING' : 'IDLE'
      console.log({nextState})
      return {
        ...state,
        state: selectors.hasQueuedStops(state) ? 'MOVING' : 'IDLE'
      }
    default:
      return state;
  }
}

function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const callElevator = stopIndex =>
    dispatch({ type: "PRESS_CALL_BUTTON", stopIndex });
  
  const { currentStopIdx } = state;
 console.log(state)

  return (
    <div className="App">
      <div className="elevator">
        <div className="elevator-track">
          <ElevatorCar {...state} dispatch={dispatch} />
          {BuildingStats.stops.map(({ name }, idx, array) => {
            const modifier = idx === array.length - 1 ? "last" : "";

            return (
              <div className={`elevator-stop ${modifier}`}>
                <div className="elevator-stop__label">
                  <HighlightButton
                    onClick={() => callElevator(idx)}
                    shouldToggleHighlight={() => idx === currentStopIdx && state.state === 'WAITING_FOR_DISEMBARK'}
                  >
                    Call {name}
                  </HighlightButton>
                </div>
                <div className="elevator-stop__pip" />
              </div>
            );
          })}
        </div>
      </div>
      <CarControls>
        <div className="car-controls__buttons">
          {BuildingStats.stops.map(({ name }, idx) => (
            <HighlightButton
              className="car-controls__button" 
              onClick={() => callElevator(idx)}
              shouldToggleHighlight={() => idx === currentStopIdx}
            >
              {name}
            </HighlightButton>
          ))}
        </div>
      </CarControls>
    </div>
  );
}

export default App;
