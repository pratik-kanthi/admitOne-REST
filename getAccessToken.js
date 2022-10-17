const axios = require('axios');


const getToken = async ()=>{
	const result = await axios.post('https://data.cinemas-online.co.uk/login',{
		UserName: "karan@e9ine.com",
		Password: "ipodtouch."
	});

	return  result.data.TokenString;
}


module.exports = {
	getToken
}






