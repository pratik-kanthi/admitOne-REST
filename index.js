const axios = require('axios');
const xmlstringparser = require('xml2js-parser').parseStringSync;
const { getToken } = require('./getAccessToken');
const moment = require('moment');
const {getVenues, getTitleMap, getTypeIDs} = require('./airtableService');

let api = null;
let absentMovies = [];
let venues = [];
let titleMap = null;
let typeIDs = null;


// begin here
(async()=>{
	try{
		const token = await getToken();
		api = axios.create({
			baseURL: 'https://data.cinemas-online.co.uk/',
			headers: {'Authorization': `Bearer ${token}`}
		});
		titleMap = await getTitleMap();
		venues = await getVenues();
		typeIDs = await getTypeIDs();

		for (let i in venues){
			const venue = venues[i];
			try{
				await processVenues(venue);
			}catch (e) {
				console.log(`Process failed for ${venue.venue_name}`);
			}
		}
		console.log(absentMovies);
	}catch (e) {
		console.error(e);
	}
})();



const processVenues = async (source)=>{
	return new Promise(async (resolve,reject)=>{
		try{
			const feed = await axios.get(source.venue_xml);
			const data = await xmlstringparser(feed.data,{
				explicitArray: false,
				trim: true
			});
			const moviesList = data.admitOne.events.event;
			const showDates = data.admitOne.performances.performance;

			// filter movies with at least one show date
			const movies = moviesList.filter(m=>{
				let val = false;
				showDates.map(s=>{
					if(m.internalCode === s.eventCode){
						val = true;
					}
				});
				return val;
			});


			for(let i in movies){
				try{
					let movie = movies[i];
					let movieId = await getMovieIdByTitle(movie.name);

					if(movieId){
		  				const showtimesId = await getShowTimesId(movieId, source.venue_id);
						const movie_showdates = [];

						showDates.map(showDate=>{
							if (movieId && movie.internalCode === showDate.eventCode){
								movie_showdates.push({
									title: movie.name,
									scheduleDate: showDate.scheduleDate,
									time: showDate.time,
									link: `${source.venue_page}${showDate.$.performanceCode}`,
									type: showDate.performanceType ? showDate.performanceType.$.code : 'STANDARD'
								});
							}
						});

						const store = {};
						movie_showdates.map(show => {
							if (store[show.scheduleDate]) {
								store[show.scheduleDate].push({
									Time: show.time,
									Type: show.type,
									ShowtimeLink: show.link
								});
							} else {
								store[show.scheduleDate] = [];
								store[show.scheduleDate].push({
									Time: show.time,
									Type: show.type,
									ShowtimeLink: show.link
								})
							}
						});

						let transformDates = [];
						for (const storeKey in store) {
							const times = [];
							store[storeKey].map(t => {
								times.push({
									Time: moment(t.Time, 'YYYYMMDDHHmmss').toDate(),
									ShowtimeLink: t.ShowtimeLink,
									Type: typeIDs[t.Type]
								})
							});
							transformDates.push({
								ShowDate: moment(storeKey).toDate(),
								Times: times
							})
						}

						try{
							await importShowTime(source.venue_id,movieId,showtimesId,transformDates);
							console.log(`Done import ${source.venue_name} ${movie.name}`)
						}catch (e) {
							console.error(`Failed import ${source.venue_name} ${movie.name}`)
						}

					}else{
						absentMovies.push(movie.name);
					}

				}catch (e) {
					console.error(`${movies[i].name} Error`);
				}
			}
			resolve();
		}catch (e) {
			reject(e);
		}
	});
}

const importShowTime = async (venueId, movieId, showTimeId, showDates)=>{
	return new Promise(async (resolve,reject)=>{
		try{

			if(showTimeId){
				const bodyObj = {
					"_id": showTimeId,
					"Brand": "5772cc3927b2828846fd7bfd",
					"Venue": venueId,
					"Movie": movieId,
					"ShowDates": showDates
				};
				await api.put(`api/showtimes?_id=${showTimeId}`, bodyObj);
			}else{
				const bodyObj = {
					"Brand": "5772cc3927b2828846fd7bfd",
					"Venue": venueId,
					"Movie": movieId,
					"ShowDates": showDates,
				};
				await api.post(`api/showtimes`, bodyObj);
			}
			resolve();
		}catch (e){
			reject(e);
		}
	});
}




// get movie id
const getMovieIdByTitle = (title)=>{
	return new Promise(async (resolve,reject)=>{
		let movie_id = null, results = null;

		try{
			results = await api.get(`/api/movies?$filter=Title+eq+%27${title}%27`);
			if(results.data.length > 0){
				movie_id = results.data[0]._id;
			}
		}catch (e) {

		}

		try{
			if(!movie_id){
				const resolvedTitle = titleMap[title];
				if(resolvedTitle){
					results = await api.get(`/api/movies?$filter=Title+eq+%27${resolvedTitle}%27`);
					if(results.data.length > 0){
						movie_id = results.data[0]._id;
					}
				}
			}
		}catch (e) {
			console.log(title, titleMap[title]);
		}

		resolve(movie_id);
	});
};


const getShowTimesId = (movieId, venueId)=>{
	return new Promise(async (resolve,reject)=>{
		try{
			const results = await api.get(`/api/showtimes?$filter=Movie+eq+%27${movieId}%27+%26%26+Venue+eq+%27${venueId}%27&$expand=Movie`);
			if(results.data && results.data.length > 0){
				resolve(results.data[0]._id);
			}
			resolve(null);
		}catch (e) {
			reject(e);
		}
	});
};








