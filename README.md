# Anor

Graph for TFT (teamfight tactics)

## Demo

[https://tetranoir.github.io/anor](https://tetranoir.github.io/anor)

### Features
 * Graph of champions (or any objects really) linked by their class and origin synergies
     * libraries: d3, react-vis-force
 * Neighbor highlighting
 * Selection with summary attributes
 * Filtering
     * on: tier,
 * Graph centrality analysis
     * centrality algos: eccentricity, degree, closeness, betweenness
     * libraies: ngraph, d3-color
 * Item reference
     * Grid graph visualization (discrete axis graph visualization)


### Todo
 * add synergy icons
 * surface centrality values
 * centrality color legend
 * centrality tooltip help to explain what each thing does
 * dark mode
 * select/mark items
 * add support for synergy aliases (to allow setting variable to something else)
 * add support for synergy cheating (to mimic spat items)
 * some champion icons could better reflect in game skins
 * fix terrible css (define primary, secondary, dark primary, dark secondary)