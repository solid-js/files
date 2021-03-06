import * as FileUtils from  './FileUtils'



export class FileEntity
{
	// Path pointing to the file or folder
	readonly path:string

	// TODO
	readonly sync:boolean

	constructor (filePath:string, sync = false)
	{
		this.path = filePath;
		this.sync = sync;

		this.init();
	}

	protected init ()
	{

	}

	// ------------------------------------------------------------------------- FILE SYSTEM STATES

	/**
	 * If this file or folder exists in the file system.
	 * Can be false when creating a new file for example.
	 */
	exists ()
	{
		FileUtils.exists( this.path );
	}
	// Aliases
	isReal () { return this.exists() }

	/**
	 * If this is a folder.
	 */
	isFolder ()
	{
		FileUtils.isFolder( this.path );
	}
	// Aliases
	isDir () { return this.isFolder() }
	isDirectory () { return this.isFolder() }

	/**
	 * If this is a file.
	 */
	isFile ()
	{
		FileUtils.isFile( this.path );
	}


	// ------------------------------------------------------------------------- FILE SYSTEM ACTIONS

	copy ()
	{

	}

	move ()
	{

	}

	delete ()
	{

	}
	remove () { this.delete() }
}
