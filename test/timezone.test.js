import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateUpcomingShows } from '../src/catalog/generator.js';

// Seed mock template shows
const mockTemplates = [
  {
    id: 101,
    movie_id: 1,
    screen_id: 1,
    starts_at: '2026-08-08T06:00:00.000Z', // 12:00:00+06 (Day 8 template)
    price_cents: 40000,
  },
  {
    id: 102,
    movie_id: 2,
    screen_id: 1,
    starts_at: '2026-08-09T12:30:00.000Z', // 18:30:00+06 (Day 9 template)
    price_cents: 45000,
  },
  {
    id: 103,
    movie_id: 3,
    screen_id: 1,
    starts_at: '2026-08-09T20:00:00.000Z', // 2026-08-10 02:00:00+06 (Day 10 template)
    price_cents: 50000,
  },
];

// Helper to convert UTC starts_at back to Bangladesh local date string (YYYY-MM-DD)
function toBstDateString(iso) {
  const bstTime = new Date(new Date(iso).getTime() + 6 * 60 * 60 * 1000);
  return bstTime.toISOString().substring(0, 10);
}

test('Timezone Case 1: Before Bangladesh midnight', () => {
  // 2026-08-12 23:30:00+06 corresponds to 2026-08-12T17:30:00.000Z
  const nowMs = Date.parse('2026-08-12T17:30:00.000Z');
  
  const generated = calculateUpcomingShows(nowMs, mockTemplates);
  assert.ok(generated.length > 0);

  // Check generated dates in BST representation
  const dates = [...new Set(generated.map(s => toBstDateString(s.starts_at)))].sort();
  assert.deepEqual(dates, [
    '2026-08-11',
    '2026-08-12',
    '2026-08-13',
    '2026-08-14',
    '2026-08-15',
    '2026-08-16',
    '2026-08-17',
    '2026-08-18'
  ]);
});

test('Timezone Case 2: After Bangladesh midnight', () => {
  // 2026-08-13 00:30:00+06 corresponds to 2026-08-12T18:30:00.000Z
  const nowMs = Date.parse('2026-08-12T18:30:00.000Z');
  
  const generated = calculateUpcomingShows(nowMs, mockTemplates);
  assert.ok(generated.length > 0);

  // Since we are in August 13 BST, we generate:
  // Yesterday = Aug 12, Today = Aug 13, Tomorrow = Aug 14, ..., Today+6 = Aug 19
  const dates = [...new Set(generated.map(s => toBstDateString(s.starts_at)))].sort();
  assert.deepEqual(dates, [
    '2026-08-12',
    '2026-08-13',
    '2026-08-14',
    '2026-08-15',
    '2026-08-16',
    '2026-08-17',
    '2026-08-18',
    '2026-08-19'
  ]);
});

test('Timezone Case 3: Rolling-window boundaries', () => {
  const nowMs = Date.parse('2026-08-12T08:00:00.000Z'); // 2026-08-12 14:00:00+06
  const generated = calculateUpcomingShows(nowMs, mockTemplates);
  
  // Boundary 1: first day is yesterday (August 11)
  const firstDayShows = generated.filter(s => toBstDateString(s.starts_at) === '2026-08-11');
  assert.ok(firstDayShows.length > 0, 'Should generate shows for Yesterday (Aug 11)');
  
  // Boundary 2: last day is Today+6 (August 18)
  const lastDayShows = generated.filter(s => toBstDateString(s.starts_at) === '2026-08-18');
  assert.ok(lastDayShows.length > 0, 'Should generate shows for Today+6 (Aug 18)');

  // Outer bounds check: no shows before August 11 or after August 18
  const outOfBounds = generated.filter(s => toBstDateString(s.starts_at) < '2026-08-11' || toBstDateString(s.starts_at) > '2026-08-18');
  assert.equal(outOfBounds.length, 0, 'No shows should be generated outside the [-1, 6] day window');
});

test('Timezone Case 4: Host timezone independence', () => {
  // Test is mathematically guaranteed by the UTC implementation:
  // 1. It only uses timezone-neutral calculations (Date.now(), Date.UTC(), and getUTC* methods).
  // 2. We verify that the constructed starts_at is formatted exactly in UTC.
  const nowMs = Date.parse('2026-08-12T03:36:37.000Z');
  const generated = calculateUpcomingShows(nowMs, mockTemplates);

  // A Day 9 template show (12:30:00Z UTC, 18:30:00 BST) generated for August 12
  // should yield exactly starts_at '2026-08-12T12:30:00.000Z' regardless of environment.
  // Aug 12 offsetDays from Aug 8 is 4.
  // Modulo 3 mapping: 4 % 3 = 1 -> matches template Day 9 (102).
  const matchingShow = generated.find(s => toBstDateString(s.starts_at) === '2026-08-12' && s.movie_id === 2);
  assert.ok(matchingShow);
  assert.equal(matchingShow.starts_at, '2026-08-12T12:30:00.000Z');
});

test('Timezone Case 5: Template date extraction using BST semantics', () => {
  const nowMs = Date.parse('2026-08-12T03:36:37.000Z');
  const generated = calculateUpcomingShows(nowMs, mockTemplates);

  // Template 103 starts_at is '2026-08-09T20:00:00.000Z' (which is 2026-08-10 02:00:00+06).
  // Under BST local date semantics, this belongs to template Day 10.
  //
  // Let's verify it maps to Day 10 (offsetDays % 3 === 2).
  // Aug 12 (today) offsetDays is 4.
  // Tomorrow (Aug 13) offsetDays is 5. 5 % 3 = 2 -> Day 10 template.
  // So Day 10 template show (103) should be scheduled for August 13 (tomorrow)!
  const scheduledOnAug13 = generated.find(s => toBstDateString(s.starts_at) === '2026-08-13' && s.movie_id === 3);
  assert.ok(scheduledOnAug13, 'Should correctly map Template 103 to Day 10 and schedule on Aug 13');
  
  // Verify starts_at of scheduled show is 02:00:00+06 on Aug 13 (which is Aug 12 20:00:00Z UTC)
  assert.equal(scheduledOnAug13.starts_at, '2026-08-12T20:00:00.000Z');
});
