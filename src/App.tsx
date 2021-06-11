import React, {
  useEffect,
  useReducer,
  useState,
  useRef,
} from "react";
import classnames from "classnames";
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

// Hook
// function usePrevious(value: any) {
//   // The ref object is a generic container whose current property is mutable ...
//   // ... and can hold any value, similar to an instance property on a class
//   const ref = useRef();

//   // Store current value in ref
//   useEffect(() => {
//     ref.current = value;
//   }, [value]); // Only re-run if value changes

//   // Return previous value (happens before update in useEffect above)
//   return ref.current;
// }

type HighlightPropsType = {
  onClick: Function,
  children: React.ReactNode,
  className?: string,
  shouldToggleHighlight: Function
};

function HighlightButton({
  onClick,
  children,
  className,
  shouldToggleHighlight
}: HighlightPropsType) {
  const [isHighlighted, setHighlighted] = useState(false);
  const classNames: string = classnames("highlight-button", className, {
    "highlight-button--is-active": isHighlighted
  });

  useEffect(() => {
    if (shouldToggleHighlight()) {
      setHighlighted(false);
    }
  });

  return (
    <button
      type="button"
      className={classNames}
      onClick={() => {
        setHighlighted(true);
        onClick();
      }}
    >
      {children}
    </button>
  );
}

HighlightButton.defaultProps = {
  className: ""
};

const calculateElevatorPosition = (idx: number): number =>
  30 * idx + 10 * idx - idx * 2;

type CarControlsPropsType = {
  children: React.ReactNode
};

function CarControls({ children }: CarControlsPropsType) {
  return (
    <div className="car-controls">
      <h2>Car Controls</h2>
      {children}
    </div>
  );
}

const selectors = {
  hasQueuedStops: (state: AppState): boolean => state.stopQueue.length > 0
};

type CarPropsType = {
  position: number
};

function Car({ position }: CarPropsType): React.ReactElement<"div"> {
  return (
    <div
      className="elevator-car"
      style={{
        top: position
      }}
    />
  );
}

type DirectionType = "up" | "down";

type TransitioningCarPropsType = {
  startIndex: number,
  endIndex: number,
  onComplete: () => void,
  onPassFloor: (stopIndex: number) => void,
  transitionStopIndex: number
};

function TransitioningCar({
  startIndex,
  endIndex,
  onComplete,
  onPassFloor,
  transitionStopIndex
}: TransitioningCarPropsType): React.ReactElement<typeof Car> {
  const position = useRef(0);
  const startPosition = useRef(calculateElevatorPosition(startIndex));

  const direction = startIndex < endIndex ? "up" : "down";

  useEffect(() => {
    if (direction === "up") {
      if (
        position.current > calculateElevatorPosition(transitionStopIndex + 1)
      ) {
        onPassFloor(transitionStopIndex + 1);
      }
    } else {
      if (
        position.current < calculateElevatorPosition(transitionStopIndex - 1)
      ) {
        onPassFloor(transitionStopIndex - 1);
      }
    }
  }, [position.current, direction]);
  // 
  //   const previousEndIndex = usePrevious(endIndex);
  //   useEffect(() => {
  //     if (previousEndIndex) {
  //       startPosition.current = position.current;
  //       console.log("END INDEX UPDATED", endIndex);
  //     }
  //   }, [position.current]);
  // const endIndexHasChanged = useHasEndIndexChanged(endIndex);

  // console.log(position.current);
  const endPosition = calculateElevatorPosition(endIndex);
  const delta = endPosition - startPosition.current;

  const animationTime = Math.abs(
    BuildingStats.timeBetweenFloors * (endIndex - startIndex)
  );
  const animationProgress = useAnimation("linear", animationTime, 0);
  position.current = startPosition.current + delta * animationProgress;

  useEffect(() => {
    if (position.current === endPosition) {
      onComplete();
    }
  });

  return <Car position={position.current} />;
}

let waitTimeout;

type ElevatorCarPropsType = AppState & {
  dispatch: DispatchFunctionType
};

function ElevatorCar(
  props: ElevatorCarPropsType
): React.ReactElement<typeof TransitioningCar | typeof Car> {
  const {
    stopQueue,
    currentStopIdx,
    transitionStopIndex,
    dispatch,
    state
  } = props;
  const [
    isTransitioning,
    setIsTransitioning
  ] = useState(false);

  const [endIndex] = stopQueue;

  function onTransitionComplete(): void {
    dispatch({ type: "CAR_TRANSITION_COMPLETE" });
    waitTimeout = setTimeout(
      () => dispatch({ type: "DISEMBARK_COMPLETE" }),
      BuildingStats.stopDelay
    );
    setIsTransitioning(false);
  }

  useEffect(() => {
    if (state === "MOVING") {
      setIsTransitioning(true);
    }
  });

  return isTransitioning ? (
    <TransitioningCar
      startIndex={currentStopIdx}
      endIndex={endIndex}
      onComplete={onTransitionComplete}
      transitionStopIndex={transitionStopIndex}
      onPassFloor={(stopIndex: number) =>
        dispatch({ type: "TRANSITION_POSITION_UPDATE", payload: { stopIndex } })
      }
    />
  ) : (
    <Car position={calculateElevatorPosition(currentStopIdx)} />
  );
}

type CarState = "IDLE" | "MOVING" | "WAITING_FOR_DISEMBARK";
type StopQueue = number[];

type AppState = {
  stopQueue: StopQueue,
  currentStopIdx: number,
  transitionStopIndex: number,
  state: CarState
};

const initialState: AppState = {
  stopQueue: [],
  currentStopIdx: BuildingStats.stops.length - 2,
  transitionStopIndex: BuildingStats.stops.length - 2,
  state: "IDLE"
};

function sortQueue(stopQueue: StopQueue, currentStopIdx: number): StopQueue {
  const { above, below } = stopQueue.reduce(
    (acc, item) => {
      const whichList = item <= currentStopIdx ? "above" : "below";
      acc[whichList].push(item);
      return acc;
    },
    { above: [] as number[], below: [] as number[] }
  );

  const sortedStopQueue = [...below.sort(), ...above.sort((a, b) => b - a)];
  console.log({
    stopQueue,
    sortedStopQueue
  });
  return sortedStopQueue;
}

type CallButtonAction = {
  type: "PRESS_CALL_BUTTON",
  payload: {
    stopIndex: number
  }
};

type TransitionPositionUpdate = {
  type: "TRANSITION_POSITION_UPDATE",
  payload: {
    stopIndex: number
  }
};

type CarTransitionCompleteAction = {
  type: "CAR_TRANSITION_COMPLETE"
};

type DisembarkCompleteAction = {
  type: "DISEMBARK_COMPLETE"
};

type ReduxAction =
  | CallButtonAction
  | CarTransitionCompleteAction
  | DisembarkCompleteAction
  | TransitionPositionUpdate;

function reducer(state: AppState, action: ReduxAction): AppState {
  console.log({ state, action });
  switch (action.type) {
    case "PRESS_CALL_BUTTON":
      return action.payload.stopIndex === state.currentStopIdx &&
        state.state !== "MOVING"
        ? state
        : {
          ...state,
          stopQueue: sortQueue(
            [...state.stopQueue, action.payload.stopIndex],
            state.currentStopIdx
          ),
          state: state.state === "IDLE" ? "MOVING" : state.state
        };
    case "CAR_TRANSITION_COMPLETE":
      const [newIndex, ...restOfQueue] = state.stopQueue;
      return {
        ...state,
        stopQueue: restOfQueue,
        currentStopIdx: newIndex,
        state: "WAITING_FOR_DISEMBARK"
      };

    case "DISEMBARK_COMPLETE":
      const nextState = selectors.hasQueuedStops(state) ? "MOVING" : "IDLE";
      console.log({ nextState });
      return {
        ...state,
        state: selectors.hasQueuedStops(state) ? "MOVING" : "IDLE"
      };
    case "TRANSITION_POSITION_UPDATE":
      return {
        ...state,
        transitionStopIndex: action.payload.stopIndex
      };
    default:
      return state;
  }
}

type DispatchFunctionType = (action: ReduxAction) => void;

function App() {
  const [state, dispatch] = useReducer(
    reducer,
    initialState
  );

  const callElevator = (stopIndex: number) =>
    dispatch({ type: "PRESS_CALL_BUTTON", payload: { stopIndex } });

  const { currentStopIdx } = state;
  console.log(state);

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
                    shouldToggleHighlight={() =>
                      idx === currentStopIdx &&
                      state.state === "WAITING_FOR_DISEMBARK"
                    }
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
