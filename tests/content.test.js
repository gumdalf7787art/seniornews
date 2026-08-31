import test from 'node:test';
import assert from 'node:assert/strict';
import { articles, categories } from '../src/data/articles.js';

test('sample articles have unique slugs and accessible images', () => {
  assert.equal(new Set(articles.map((article) => article.slug)).size, articles.length);
  for (const article of articles) {
    assert.ok(article.title && article.summary && article.body.length);
    assert.ok(article.imageAlt.length >= 5);
    assert.ok(categories.some((category) => category.slug === article.category));
  }
});

test('homepage categories have one featured and four supporting articles', () => {
  for (const category of categories.slice(0, 4)) {
    const categoryArticles = articles.filter((article) => article.category === category.slug);
    assert.ok(categoryArticles.length >= 5, `${category.name} needs at least five articles`);
  }
});
