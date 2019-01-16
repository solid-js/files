//import * as path from 'path'
//import * as fs from 'fs'
import * as glob from 'glob'
//import * as fse from 'fs-extra'
import * as FileUtils from  './FileUtils'
import { FileEntity } from './FileEntity'
import { File } from './File'
import { Folder } from './Folder'

// -----------------------------------------------------------------------------

interface IFilter
{
	(file:string) : boolean
}

type EntityHandler 	= (entity:FileEntity) 	=> any
type FileHandler 	= (entity:File) 		=> any
type FolderHandler 	= (entity:Folder) 		=> any

// -----------------------------------------------------------------------------

/**
 * Target files and folders from a glob.
 * @param pattern Glob pattern @see https://www.npmjs.com/package/glob
 * @param cwd Root directory to search from. Default is process.cwd()
 * @param filter Filter function to filter some files at each updates. Useful to simplify glob pattern.
 */
export async function F$ (pattern:string, cwd?:string, filter?:IFilter)
{
	return await new Match(pattern, cwd, filter)
}


export class Match
{
	// ------------------------------------------------------------------------- LOCALS

	// Glob pattern @see https://www.npmjs.com/package/glob
	readonly pattern		:string

	// Root directory to search from.
	readonly cwd			:string

	// Filter function to filter some files at each updates. Useful to simplify glob pattern.
	readonly filter			:IFilter

	// List of all file and folders paths found after update() from glob and filter.
	protected _paths		:string[];
	get paths () { return this._paths }


	// ------------------------------------------------------------------------- INIT & UPDATE

	/**
	 * Target files and folders from a glob.
	 * @param pattern Glob pattern @see https://www.npmjs.com/package/glob
	 * @param cwd Root directory to search from. Default is process.cwd()
	 * @param filter Filter function to filter some files at each updates. Useful to simplify glob pattern.
	 */
	async constructor ( pattern:string, cwd?:string, filter?:IFilter )
	{
		// Save match parameters and search for the first time
		this.pattern 	= pattern
		this.cwd 		= cwd || process.cwd()
		this.filter 	= filter

		await this.update()
	}

	/**
	 * Update files list from current glob.
	 * Match.glob is a public property and can be updated.
	 * a new Match.paths property is written after this call.
	 * Match.filter is used to filter files paths.
	 */
	async update ():Promise<void>
	{
		return new Promise( (resolve, reject) =>
		{
			// Get all file paths from glob
			glob( this.pattern, {
				cwd: this.cwd,
			}, ( error, paths ) =>
			{
				if ( error )
				{
					reject( error );
					return;
				}

				//
				this._paths = paths;

				// Filter all those file paths if there is a filter
				if ( this.filter )
				{
					this._paths = this._paths.filter( this.filter );
				}

				resolve();
			});
		});
	}


	// ------------------------------------------------------------------------- BROWSE

	/**
	 * Browse through all targeted files and folders from glob.
	 * @param handler First argument will be a FileEntity object (File or Folder)
	 */
	all ( handler : EntityHandler ) : any[]
	{
		return this._paths.map( filePath =>
			handler(
				FileUtils.isFile( filePath )
				? new File( filePath )
				: new Folder( filePath )
			)
		);
	}

	/**
	 * Browse through all targeted files (without folders) from glob.
	 * @param handler First argument will be a File object
	 */
	files ( handler : FileHandler ) : any[]
	{
		return this._paths.filter(
			filePath => FileUtils.isFile( filePath )
		)
		.map( filePath => new File( filePath ) )
		.map( handler )
	}

	/**
	 * Browse through all targeted folder (without files) from glob.
	 * @param handler First argument will be a Folder object
	 */
	folders ( handler : FolderHandler ) : any[]
	{
		return this._paths.filter(
			filePath => FileUtils.isFolder( filePath )
		)
		.map( filePath => new Folder( filePath ) )
		.map( handler )
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
			+ '#'
			// Add last modified timestamp to hash if asked
			+ (lastModified ? file.lastModified() : '')
			+ '#'
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
