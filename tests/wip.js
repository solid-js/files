/**
 * Work in progress file.
 * This file is meant to be used when working on your lib.
 * Useful when trying to get something working before it's testable.
 */

const { F$ } = require('../dist/index');

const a = F$('**/1.txt', 'tests/warzone');

console.log( a );
