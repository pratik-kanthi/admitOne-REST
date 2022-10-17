const Airtable = require('airtable');
const base = new Airtable({apiKey: 'keyGV5bU4IIzQHKCV'}).base('appBy0dYawDLYS3lL');


const getVenues = ()=>{
	return new Promise(async (resolve,reject)=>{
		try{
			const venues = [];
			const venueResults = await base('venues').select({view: "Grid view"});
			await venueResults.eachPage((records)=>{
				records.map((r)=>{
					venues.push(r.fields);
				});
				resolve(venues)
			});
		}catch (e) {
			reject('Failed to fetch venues');
		}
	});
};


const getTitleMap = ()=>{
	return new Promise(async (resolve,reject)=>{
		try{
			const movies = {};
			const movieResults = await base('movies').select({view: "Grid view"});
			await movieResults.eachPage((records)=>{
				records.map((r)=>{
					movies[r.fields.admit1_title] = r.fields.db_title;
				});
				resolve(movies)
			});
		}catch (e) {
			reject('Failed to fetch title map');
		}
	});
};

const getTypeIDs = () => {
	return new Promise(async (resolve,reject)=>{
		try{
			const types = {};
			const typeResults = await base('showtypes').select({view: "Grid view"});
			await typeResults.eachPage((records)=>{
				records.map((r)=>{
					types[r.fields.label] = r.fields.db_id;
				});
				resolve(types)
			});
		}catch (e) {
			reject('Failed to fetch typeIDs');
		}
	});
}

module.exports = {
	getVenues,
	getTitleMap,
	getTypeIDs
}
