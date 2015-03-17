---
layout: default
title: Lab
---

<section class="lab content container">
{% capture md %}

## Lab Experiments

A complete index of all my lab experiments

In my spare time I enjoy exploring miscellaneous mathematical or computer-science related topics that tend to consume my mind for a while through programming and visualization. More code and projects can be found at my [GitHub profile](https://github.com/mdciotti).

*Please note: many of these experiments have not been fully tested for cross-browser support.*
{: class="soft"}

{% endcapture %}
{{ md | markdownify }}

<div class="grid">
	{% for experiment in site.experiments reversed | sort: 'date' %}
		<div class="grid-item">
			<div class="grid-item-preview"><img src="/img/preview/{{ experiment.preview_img_src }}"></div>
			<div class="grid-item-caption">
				<h3 class="grid-item-title">{{ experiment.title | upcase }} <span class="year">{{ experiment.date | date: "%Y" }}</span></h3>
				<ul class="grid-item-actions">
					{% if experiment.available %}<li class="grid-item-action"><a href="{{ experiment.location }}" class="button">Launch Experiment</a></li>{% endif %}
					<li class="grid-item-action"><a href="{{ experiment.source }}" class="button">GitHub</a></li>
				</ul>
				<div class="grid-item-description">{{ experiment.output }}</div>
			</div>
		</div>
	{% endfor %}
</div>
</section>
