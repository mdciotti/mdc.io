---
layout: default
title: Journal
---

<section class="journal content container">
{% capture md %}

## Journal Archive

A complete index of all my journal entries

Would you like to receive the latest posts as they are published? Go ahead and [Subscribe](/journal/feed.xml).

{% endcapture %}
{{ md | markdownify }}

<div class="list">
{% for entry in site.posts %}
	<div class="list-item">
		<h4 class="list-item-title">
			<time datetime="{{ entry.date | date_to_xmlschema }}">{{ entry.date | date: "%m/%Y" }}</time>
			<a href="{{ entry.url }}" class="entry-title">{{ entry.title }}</a>
		</h4>
		<p class="list-item-description">{{ entry.description }}</p>
	</div>
{% endfor %}
</div>
</section>
