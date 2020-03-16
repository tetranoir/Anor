import * as R from 'ramda';

/**
 * Phalanx migration is a method operated on a graph and 2 sets of nodes by
 * which a "source" uses a additionals and removals to become the
 * "destination" set.
 *
 * Phalanx migration which optimizes on all nodes to have as many neighbors as
 * possible during the transition.
 *
 * All source and destination nodes must exist in the graph.
 *
 * @param {Graph}    graph Graph containing of nodes and links.
 * @param {string[]} src   Source nodes as a list of ids.
 * @param {string[]} dest  Destination nodes as a list of ids.
 *
 * @return {Transitions[]} Returns a depedency graph of transitions, each
 *                         transition having a list of nodes to add and an
 *                         list of nodes to remove. Each transition should only
 *                         only be applied after its parents are completed.
 */

export interface Node {
  id: string;
}

export interface Link {
  source: string;
  target: string;
}

export interface Transitions {
  parents: Transitions[];     // transitions this transition depends on
  add: string[];              // additions to the current set
  remove: string[];           // removals from the current set
}

export interface Graph {
  links: Link[];
  nodes: Node[];
}

// Used to measure how connected a node within a set of nodes
interface Connectivity {
  connectivity: number;
}

// Used for distance of a node from another node
interface Distance {
  distance: number;
}

// Extended node, used as a convenience
interface xNode extends Node, Connectivity, Distance {}

export function phalanx(
  graph: Graph,
  src: string[],
  dest: string[],
): Transitions[] {


  return [];
}
