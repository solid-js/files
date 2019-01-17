/**
 * Work in progress dev file.
 * This file is meant to be used when working on your lib.
 * Useful when trying to get something working before it's testable.
 */

const { F$, F$ync } = require('../dist/index');

(async () =>
{
	const allTextFiles = await F$('**/*.txt', 'tests/warzone');

	allTextFiles.all( file =>
	{
		console.log(file);
	})
})();
