const glob = require('glob')
import * as path from 'path'
import * as FileUtils from  './FileUtils'
import { FileEntity } from './FileEntity'
import { File } from './File'
import { Folder } from './Folder'

// ----------------------------------------------------------------------------- STRUCTURE

// Defining what is a basic file filter
interface IFilter
{
	(filePath:string) : boolean
}

// Handlers types
type EntityHandler 	= (entity:FileEntity) 	=> any
type FileHandler 	= (entity:File) 		=> any
type FolderHandler 	= (entity:Folder) 		=> any

// ----------------------------------------------------------------------------- GLOBAL HELPERS / MAIN CLASS

/**
 * Target files and folders from a glob.
 * @param pattern Glob pattern @see https://www.npmjs.com/package/glob
 * @param cwd Root directory to search from. Default is process.cwd()
 * @param filter Filter function to filter some files at each updates. Useful to simplify glob pattern.
 */
export async function F$ ( pattern:string, cwd?:string, filter?:IFilter )
{
	const match = new Match( pattern, cwd, filter )
	await match.update()
	return match
}

/**
 * Target files and folders from a glob synchronously.
 * In sync mode, glob updates are synchronous. It can hurt main thread, like running servers
 * but is preferable for static node routines and can avoid top level awaits.
 * @param pattern Glob pattern @see https://www.npmjs.com/package/glob
 * @param cwd Root directory to search from. Default is process.cwd()
 * @param filter Filter function to filter some files at each updates. Useful to simplify glob pattern.
 */
export function F$ync ( pattern:string, cwd?:string, filter?:IFilter )
{
	return new Match( pattern, cwd, filter, true )
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

	// In sync mode, glob updates are synchronous.
	readonly sync			:boolean

	// List of all file and folders paths found after update() from glob and filter.
	protected _paths		:string[]

	// If an update is running asynchronously
	protected _isUpdating		:boolean = false
	get isUpdating () { return this._isUpdating }


	// ------------------------------------------------------------------------- INIT & UPDATE

	/**
	 * Target files and folders from a glob.
	 * @param pattern Glob pattern @see https://www.npmjs.com/package/glob
	 * @param cwd Root directory to search from. Default is process.cwd()
	 * @param filter Filter function to filter some files at each updates. Useful to simplify glob pattern.
	 * @param sync In sync mode, glob updates are synchronous.
	 */
	constructor ( pattern:string, cwd?:string, filter?:IFilter, sync = false )
	{
		// Save match parameters and search for the first time
		this.pattern 	= pattern
		this.cwd 		= cwd || process.cwd()
		this.filter 	= filter
		this.sync 		= sync

		// Update directly in constructor if we are in sync mode
		sync && this.update()
	}

	/**
	 * Update files list from current glob.
	 * Match.glob is a public property and can be updated.
	 * a new Match.paths property is written after this call.
	 * Match.filter is used to filter files paths.
	 */
	update ():Promise<string[]>
	{
		return new Promise( (resolve, reject) =>
		{
			// Set current working directory into options
			const options = { cwd: this.cwd }

			// In sync mode
			if ( this.sync )
			{
				try
				{
					// Resolve synchronously filtered paths from sync glob function
					const paths = glob.sync( this.pattern, options )
					resolve( this.filterPaths( paths ) )
				}
				catch (e) { reject( e ) }
				return
			}

			// In async mode ...

			// Reject if any update is already running on this match
			if ( this._isUpdating )
			{
				reject( new Error( 'Math already updating. Only on update at a time is allowed' ) )
				return
			}

			this._isUpdating = true

			// Get all file paths from glob
			glob( this.pattern, options, ( error, paths ) =>
			{
				this._isUpdating = false

				// Reject if any error occurred
				if ( error )
				{
					reject( error )
					return
				}

				// Filter and store all paths
				resolve(
					this.filterPaths( paths )
				)
			})
		})
	}


	/**
	 * Store paths after using the filter function.
	 * @param paths List of paths to filter and store
	 */
	protected filterPaths ( paths:string[] )
	{
		return this._paths = (
			// Filter them only if we have a filter function
			this.filter
			? this._paths.filter( this.filter )
			// Or store all of them
			: paths
		)
	}

	/**
	 * @throws Will throw an error if paths are not updated yet.
	 */
	protected checkPaths ()
	{
		if (this._paths) return
		throw new Error(`Match paths not initialized yet. Please call await update() before trying to access file list with all() files() and folders().`)
	}

	// ------------------------------------------------------------------------- BROWSE

	/**
	 * Browse through all targeted files and folders from glob.
	 * @param handler First argument will be a FileEntity object (File or Folder)
	 * @throws Will throw an error if paths are not updated yet.
	 */
	all ( handler : EntityHandler )
	{
		this.checkPaths()
		return this._paths.map( localFilePath =>
		{
			const completePath = path.join( this.cwd, localFilePath )
			handler(
				FileUtils.isFile( completePath )
				? new File( completePath, this.sync )
				: new Folder( completePath, this.sync )
			)
		})
	}

	/**
	 * Browse through all targeted files (without folders) from glob.
	 * @param handler First argument will be a File object
	 * @throws Will throw an error if paths are not updated yet.
	 */
	files ( handler : FileHandler )
	{
		this.checkPaths()
		return this._paths.filter(
			filePath => FileUtils.isFile( filePath )
		)
		.map( filePath => new File( filePath, this.sync ) )
		.map( handler )
	}

	/**
	 * Browse through all targeted folder (without files) from glob.
	 * @param handler First argument will be a Folder object
	 * @throws Will throw an error if paths are not updated yet.
	 */
	folders ( handler : FolderHandler )
	{
		this.checkPaths()
		return this._paths.filter(
			filePath => FileUtils.isFolder( filePath )
		)
		.map( filePath => new Folder( filePath, this.sync ) )
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
	 * @throws Will throw an error if paths are not updated yet.
	 * @return {string} Hex Sga256 Hash from file list and stats.
	 */
	generateFileListHash (lastModified = false, size = false)
	{
		// Browse all files
		// and create a hash for this file and add it to the global hash
		this.checkPaths()
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
		))

		// Convert all file hashs signature to a big hash
		const crypto = require('crypto')
		const hash = crypto.createHash('sha256')
		hash.update( allFilesHashSignature.join('_') )
		return hash.digest('hex')
	}
}
