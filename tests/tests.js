/**
 * Mocha doc : https://mochajs.org/#getting-started
 * Assert doc : https://www.npmjs.com/package/assert
 */
const assert = require('assert');
const { Match } = require('../dist/index');

describe('Check library modules', () =>
{
	it('Match is a function', done =>
	{
		assert.equal(typeof Match, 'function', 'Match is not a function.');
		done();
	});
});


describe('Check Match', () =>
{
	it('Match a list of files', done =>
	{
		assert.equal(typeof Match, 'function', 'Match is not a function.');
		done();
	});
});
