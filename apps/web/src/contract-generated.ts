/* Generated from packages/contracts/openapi.json. Do not edit. */
export const WORK_ITEM_STATUSES = ["OPEN","IN_PROGRESS","DONE","CANCELLED"] as const;
export type WorkItemStatus = typeof WORK_ITEM_STATUSES[number];

export const TRANSITION_ACTIONS = ["CLAIM","COMPLETE","RELEASE","CANCEL"] as const;
export type TransitionAction = typeof TRANSITION_ACTIONS[number];

export const WORK_QUEUE_OPERATIONS = {
  "list": "listWorkItems",
  "create": "createWorkItem",
  "get": "getWorkItem",
  "transition": "transitionWorkItem"
} as const;
