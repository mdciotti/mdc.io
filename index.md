---
layout: default
---

<header class="intro content container">
{% capture md %}

# Hey, I'm Maxwell.

I am a student and frontend developer. I also design websites, apps, and other digital media. Most of my time is spent obsessing over the small details on my experiments. I enjoy indie games, mountain biking, rocketry, and oddly enough, cooking. Still curious? [Discover more about me](/about).

Scroll down for more
{: class="subtitle"}

{% endcapture %}
{{ md | markdownify }}
</header>
<section class="journal content container">
{% capture md %}

## From My Journal

Articles from my [journal](/journal) since 2015

{% endcapture %}
{{ md | markdownify }}

<h3>Latest Journal Entries</h3>
<div class="small list">
{% for entry in site.posts limit:5 %}
	<div class="list-item">
		<h4 class="list-item-title">
			<a href="{{ entry.url }}" class="entry-title">{{ entry.title }}</a>
			<time datetime="{{ entry.date | date_to_xmlschema }}">{{ entry.date | date: "%m/%Y" }}</time>
		</h4>
		<p class="list-item-description">{{ entry.description }}</p>
	</div>
{% endfor %}
</div>
<p><a href="/journal" class="more button">More journal entries</a></p>

<h3>Notable Journal Entries</h3>
<div class="small list">
{% for entry in site.posts limit:3 %}
{% if entry.feature %}
	<div class="list-item">
		<h4 class="list-item-title">
			<a href="{{ entry.url }}" class="entry-title">{{ entry.title }}</a>
			<time datetime="{{ entry.date | date_to_xmlschema }}">{{ entry.date | date: "%m/%Y" }}</time>
		</h4>
		<p class="list-item-description">{{ entry.description }}</p>
	</div>
{% endif %}
{% endfor %}
</div>
</section>
<section class="lab content container">
{% capture md %}

## From My Lab

My active and published [lab](/lab) experiments

In my spare time I enjoy exploring miscellaneous mathematical or computer-science related topics that tend to consume my mind for a while through programming and visualization. Head over to my [lab](/lab) for a full listing including inactive and unpublished projects. More code and projects can be found at my [GitHub profile](https://github.com/mdciotti).

*Please note: many of these experiments have not been fully tested for cross-browser support.*
{: class="soft"}

{% endcapture %}
{{ md | markdownify }}

<div class="grid">
	{% for experiment in site.experiments reversed | sort: 'date' %}
	{% unless experiment.tags contains 'inactive' and experiment.tags contains 'incomplete' %}
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
	{% endunless %}
	{% endfor %}
</div>
</section>
