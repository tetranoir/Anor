# Anor

Graph for TFT (teamfight tactics)

## Demo

[https://tetranoir.github.io/anor](https://tetranoir.github.io/anor)

## Features
 * Graph of champions (or any objects really) linked by their class and origin synergies
     * **Libraries:** d3, react-vis-force
 * Neighbor highlighting
 * Selection with summary attributes
 * Filtering
     * **On:** tier, origin, synergy
 * Graph centrality analysis
     * Centrality algos: eccentricity, degree, closeness, betweenness
     * **Libraries:** ngraph, d3-color
 * Item reference
     * Grid graph visualization (a discrete axial graph visualization)


## Todo
 * Url state
 * Update item attributes/synergy bonuses to most recent patch
 * Add synergy icons
 * Surface centrality values
 * Centrality color legend
 * Centrality tooltip help to explain what each thing does
 * Dark mode
 * Select/mark items
 * Add support for synergy aliases (to allow setting variable to something else)
 * Add support for synergy cheating (to mimic spat items)
 * Some champion icons could better reflect in game skins
 * Fix terrible css (define primary, secondary, dark primary, dark secondary)