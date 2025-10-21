---
layout: page
permalink: /writing/
title: Writing
description: Essays, articles, and research I have shared around the web.
nav: true
nav_order: 2
years: [2018, 2017]
---

<section class="writing-section writing-blog">
  <h2>Blog</h2>
  {% assign posts = site.posts | sort: 'date' | reverse %}
  {% if posts.size > 0 %}
  <ul class="writing-post-list">
    {% for post in posts %}
    <li class="writing-post-item">
      <h3>
        {% if post.redirect == blank %}
        <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
        {% elsif post.redirect contains '://' %}
        <a href="{{ post.redirect }}" target="_blank" rel="noopener">{{ post.title }}</a>
        {% else %}
        <a href="{{ post.redirect | relative_url }}">{{ post.title }}</a>
        {% endif %}
      </h3>
      <p class="writing-post-meta">
        {{ post.date | date: '%B %-d, %Y' }}
        {% if post.external_source %}&nbsp;&middot;&nbsp;{{ post.external_source }}{% endif %}
      </p>
      {% if post.description %}
      <p>{{ post.description }}</p>
      {% elsif post.feed_content %}
      <p>{{ post.feed_content | strip_html | truncate: 160 }}</p>
      {% else %}
      <p>{{ post.excerpt | strip_html | truncate: 160 }}</p>
      {% endif %}
    </li>
    {% endfor %}
  </ul>
  <p class="writing-archive-link"><a href="{{ '/blog/' | relative_url }}">Browse the full blog archive &rarr;</a></p>
  {% else %}
  <p>No posts published yet.</p>
  {% endif %}
</section>

<section class="writing-section writing-publications">
  <h2>Publications</h2>
  {% if page.years %}
    {% for y in page.years %}
    <h3 class="year">{{ y }}</h3>
    {% bibliography -f papers -q @*[year={{y}}]* %}
    {% endfor %}
  {% else %}
  <p>Publications coming soon.</p>
  {% endif %}
</section>
