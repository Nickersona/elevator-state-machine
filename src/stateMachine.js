// Available variables:
// - Machine
// - interpret
// - assign
// - send
// - sendParent
// - spawn
// - raise
// - actions
// - XState (all XState exports)
const fetchMachine = Machine(
  {
    id: "fetch",
    initial: "idle",
    context: {
      stopQueue: [],
      currentStopIdx: 0,
      transitionStopIndex: 0,
    },
    states: {
      idle: {
        on: {
          PRESS_CALL_BUTTON: {
            target: "moving",
            actions: ["registerStop"],
          },
        },
      },
      moving: {
        on: {
          CAR_TRANSITION_COMPLETE: {
            target: "waitingForDisembark",
          },
          PRESS_CALL_BUTTON: {
            actions: ["registerStop"],
          },
        },
      },
      waitingForDisembark: {
        PRESS_CALL_BUTTON: {
          actions: ["registerStop"],
        },
        entry: ["updateCarPosition", "removeStopFromQueue"],
        after: {
          3000: [
            { target: "moving", cond: "hasQueuedStops" },
            { target: "idle" },
          ],
        },
      },
    },
  },
  {
    actions: {
      updateCarPosition: assign({
        currentStopIdx: (ctx) => ctx.stopQueue[0],
      }),
      registerStop: assign({
        stopQueue: (ctx, evt) => [...ctx.stopQueue, evt.value],
      }),
      removeStopFromQueue: (ctx) => {
        ctx.stopQueue.shift();
        return assign({
          stopQueue: ctx.stopQueue,
        });
      },
    },
    guards: {
      hasQueuedStops: (ctx) => ctx.stopQueue.length > 0,
    },
  }
);
