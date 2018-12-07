import * as path from 'path'
import * as fs from 'fs'
import * as glob from 'glob'
import * as fse from 'fs-extra'
import * as FileUtils from  './FileUtils'
import { FileEntity } from './FileEntity'
import { File } from './File'
import { Folder } from './Folder'

interface IFilter
{
	(file:string) : boolean
}

/**
 * Target files and folders from a glob.
 * @param pattern Glob pattern @see https://www.npmjs.com/package/glob
 * @param cwd Root directory to search from. Default is process.cwd()
 * @param filter Filter function to filter some files at each updates. Useful to simplify glob pattern.
 */
export function F$ (pattern:string, cwd?:string, filter?:IFilter)
{
	return new Match(pattern, cwd, filter)
}


export class Match
{
	// ------------------------------------------------------------------------- LOCALS

	// Glob pattern @see https://www.npmjs.com/package/glob
	pattern		:string

	// Root directory to search from.
	cwd			:string

	// Filter function to filter some files at each updates. Useful to simplify glob pattern.
	filter		:IFilter

	// List of all file and folders paths found after update() from glob and filter.
	paths		:string[];


	// ------------------------------------------------------------------------- INIT & UPDATE

	/**
	 * Target files and folders from a glob.
	 * @param pattern Glob pattern @see https://www.npmjs.com/package/glob
	 * @param cwd Root directory to search from. Default is process.cwd()
	 * @param filter Filter function to filter some files at each updates. Useful to simplify glob pattern.
	 */
	constructor ( pattern:string, cwd?:string, filter?:IFilter )
	{
		// Save match parameters and search for the first time
		this.pattern 	= pattern;
		this.cwd 		= cwd || process.cwd();
		this.filter 	= filter;

		this.update();
	}

	/**
	 * Update files list from current glob.
	 * Match.glob is a public property and can be updated.
	 * a new Match.paths property is written after this call.
	 * Match.filter is used to filter files paths.
	 */
	update ()
	{
		// Get all file paths from glob
		this.paths = glob.sync( this.pattern, {
			cwd: this.cwd
		});

		// Filter all those file paths if there is a filter
		if ( this.filter )
		{
			this.paths = this.paths.filter( this.filter );
		}
	}


	// ------------------------------------------------------------------------- BROWSE

	/**
	 * Browse through all targeted files and folders from glob.
	 * @param pHandler First argument will be a FileEntity object (File or Folder)
	 */
	all ( entryHandler : ((entity:FileEntity) => any) ) : any[]
	{
		return this.paths.map( filePath =>
			entryHandler(
				FileUtils.isFile( filePath )
				? new File( filePath )
				: new Folder( filePath )
			)
		);
	}

	/**
	 * Browse through all targeted files (without folders) from glob.
	 * @param pHandler First argument will be a File object
	 */
	files ( entryHandler : ((entity:File) => any) ) : any[]
	{
		return this.paths.filter(
			filePath => FileUtils.isFile( filePath )
		)
		.map( filePath => new File( filePath ) )
		.map( entryHandler )
	}

	/**
	 * Browse through all targeted folder (without files) from glob.
	 * @param pHandler First argument will be a Folder object
	 */
	folders ( entryHandler : ((entity:Folder) => any) ) : any[]
	{
		return this.paths.filter(
			filePath => FileUtils.isFolder( filePath )
		)
		.map( filePath => new Folder( filePath ) )
		.map( entryHandler )
	}


	// ------------------------------------------------------------------------- HASH

	/**
	 * Generate hash from current files list.
	 * Will generate another hash if there is other files.
	 * Can generate also a different hash from file last modified or file size.
	 * File list modified is often enough to detect changes in file system.
	 * @param lastModified Add file last modified date for each file into hash signature. Hash will change if any file last modified date changes.
	 * @param size Add file size for each file into hash signature. Hash will change if any file size changes.
	 * @return {string} Hex Sga256 Hash from file list and stats.
	 */
	generateFileListHash (lastModified = false, size = false)
	{
		// Browse all files
		// and create a hash for this file and add it to the global hash
		const allFilesHashSignature = this.files( file => (
			// Add file path so if a file is added and all options are set to false
			// global hash still changes.
			file.path
			+ '&'
			// Add last modified timestamp to hash if asked
			+ (lastModified ? file.lastModified() : '')
			+ '-'
			// Add file size to hash if asked
			+ (size ? file.size() : '')
		));

		// Convert all file hashs signature to a big hash
		const crypto = require('crypto');
		const hash = crypto.createHash('sha256');
		hash.update( allFilesHashSignature.join('_') );
		return hash.digest('hex');
	}
}
