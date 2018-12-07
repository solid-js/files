/**
 * Function to get package.json repository name.
 * Used to configure doczrc base to deploy correctly on github.io
 * https://{organisation-name}.github.io/{repo-name}/
 * /{repo-name}/ will be the base.
 */
module.exports = function ( defaultBase )
{
	// Read package.json repository URL
	const packageData = require('../package.json');
	const repoURL = (packageData.repository || {}).url || '';

	// Return default if not found
	if (!repoURL) return defaultBase;

	// Split on / and return default if not found
	const splitted = repoURL.split('/');
	if (splitted.length < 1) return defaultBase;

	// Remove trailing .git and return default if not found
	const base = splitted[ splitted.length - 1 ].split('.git')[0];
	if (!base) return defaultBase;

	// Return base surrounded by slashes
	return '/'+base+'/';
}