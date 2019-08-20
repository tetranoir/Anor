# Design Doc - Filters

## Problem

Filtering is one of the 3 problems that exists for data analytics (along with selecting, highlighting). How to abstract filtering based on the existance of object properties? I will not be addressing composite or function based filtering.

### Problem - P2

Multiple property filtering has its own problems. Toggling based on existance of a certain property or set of properties is not enough. For example... lets say you have an apple which is red and is a fruit, a banana which is yellow and a fruit, and a firetruck which is red and a vehicle. Filtering out red items and vehicle items leaves only the banana. Filtering in vehicle brings back the firetruck. But red items are still filtered out, yet the firetruck is back in (???).

## Solutions

So far, I've thought of 3 ways of doing filtering:

    1. Have 3 structures, a list of all filters, a list of filters to apply, and your immutable data. Users may pick from all filters and to be put into the applied filters which then run all filters on the data, which each filter is a negative (or positive, indicating data should or should not be filtered). The result of applying all filters to all data is your filtered data. *SLOW* runtime is O(Filters x Data)

    2. Have 4 structures, a list of all filters, a list of filters to apply, data, and a map of props to data. Force a marker on your data that describes if its filtered. Create maps of all props to data objects that may be filtered on. Filters traverse the map and toggle the data based on the marker. *Better* runtime is O(Filters). But, requires consumer of data to acknowledge that an object may be filtered out.

    3. Have 5 structures, a list of all filters, a list of filters to apply, data, map of props to data, and a list of filtered out objects
