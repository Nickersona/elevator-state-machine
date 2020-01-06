import React, { useEffect, useReducer, useState } from "react";
import useAnimation from "./hooks/useAnimation";
import "./App.css";

const BuildingStats = {
  timeBetweenFloors: 1000,
  stopDelay: 3000, // Time elevator waits on each floor without interruption before continuing
  stops: [
    { name: "Penthouse" },
    { name: "Third Floor" },
    { name: "Second Floor" },
    { name: "Ground Floor" },
    { name: "Basement" }
  ]
};

const calculateElevatorPosition = idx => 30 * idx + 10 * idx - idx * 2;

function CarControls({ stops, callElevator }) {
  return (
    <div className="car-controls">
      <h2>Car Controls</h2>
      <div className="car-controls__buttons">
        {stops.map(({ name }, idx) => (
          <button
            className="car-controls__button"
            onClick={() => callElevator(idx)}
          >
            {name}
          </button>
        ))}
      </div>
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
  const animationProgress = useAnimation("linear", animationTime, 0);
  const position = startPostion + delta * animationProgress;

  useEffect(() => {
    if(position === endPosition) { onComplete() }
  })

  return <Car position={position} />;
}

function ElevatorCar(props) {
  const { stopQueue, currentStopIdx, dispatch } = props;
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [ endIndex ] = stopQueue;

  function onTransitionComplete() {
    dispatch({ type: 'CAR_TRANSITION_COMPLETE' })
    setIsTransitioning(false);
  }

  useEffect(() => {
    if (selectors.hasQueuedStops(props)) {
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

function reducer(state, action) {
  console.log({state, action})
  switch (action.type) {
    case "PRESS_CALL_BUTTON":
      return action.stopIndex === state.currentStopIdx 
        ? state
        : {
          ...state,
          stopQueue: [...state.stopQueue, action.stopIndex]
        };
    case "CAR_TRANSITION_COMPLETE":
      const [ newIndex, ...restOfQueue ] = state.stopQueue
      return {
        ...state,
        stopQueue: restOfQueue,
        currentStopIdx: newIndex
      };
    default:
      return state;
  }
}

function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const callElevator = stopIndex =>
    dispatch({ type: "PRESS_CALL_BUTTON", stopIndex });
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
                  <button onClick={() => callElevator(idx)}>Call {name}</button>
                </div>
                <div className="elevator-stop__pip" />
              </div>
            );
          })}
        </div>
      </div>
      <CarControls stops={BuildingStats.stops} callElevator={callElevator} />
    </div>
  );
}

export default App;
