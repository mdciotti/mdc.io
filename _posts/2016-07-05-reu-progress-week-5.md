---
title: REU Progress Wk. 5
date: '2016-07-07 08:00:00'
layout: post
draft: true
---
*This post is part of an ongoing series documenting my summer research under Dr. Guoning Chen at The University of Houston. See the [first post here](#).*

This week was spent on three main aspects: improving the user interface of the 2D vector field analysis tool, streamline tapering, and continuous field discretization.

The point-in-triangle bug from last week was solved. The issue arose from the generation of the face binning structure, where bins are ordered from top left to bottom right (down is positive) but the vector space is cartesian (down is negative).

The user interface of the 2D vector field analysis tool was improved by adding a more configurable parameter menu with the [dat.GUI library](https://github.com/dataarts/dat.gui). This open source library is licensed under the Apache 2.0 license. The updated GUI allows for manipulation of the algorithm parameters such as <var>d_test</var>, <var>d_sep</var>, and candidate spacing. It also provides a simple set of toggles to enable and disable visualization of various components such as the vector mesh, binning structures, seeds, and more. File loading is implemented as drag-and-drop.

![Streamline tapering]({{ site.baseurl }}/forestryio/images/v10-2.png)

The streamline tapering effect is a method of improving the visual quality by reducing artifacts caused by abrupt beginnings and ends of streamlines. It also helps to smooth out the apparent density by thinning out streamlines that are closer to others and thickening streamlines that are further away. The thickness coefficient is calculated during advection according to the following formula:

```latex
\text{thickness}=\begin{cases}\frac{d-d_{\text{test}}}{d_{\text{sep}}-d_{\text{test}}} & \quad \text{if } d \leq d_{\text{sep}}\\1.0 & \quad \text{if } d > d_{\text{sep}}\end{cases}
```

This formula is taken directly from B. Jobard and W. Lefer. The result of this can be seen in the figure to the left. It is worth noting that the first attempt at the tapering effect was unsuccessful. The original algorithm calculated streamline thickness as a post-processing step after all streamlines had been placed. This caused streamlines to appear unsmooth and often discontinuous.
