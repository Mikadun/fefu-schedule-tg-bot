const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = 'data/drive-token.json';
const CREDENTIALS_PATH = 'data/credentials.json'

exports.sendMessage = function(path, f) {
	fs.readFile(CREDENTIALS_PATH, (err, content) => {
		if (err) return console.log('Error loading client secret file:', err);
		// Authorize a client with credentials, then call the Google Drive API.
		authorize(JSON.parse(content), uploadFile, path, f);
	});
}

function authorize(credentials, callback, path, f) {
	const {client_secret, client_id, redirect_uris} = credentials.installed;
	const oAuth2Client = new google.auth.OAuth2(
			client_id, client_secret, redirect_uris[0]);

	// Check if we have previously stored a token.
	fs.readFile(TOKEN_PATH, (err, token) => {
		if (err) return getAccessToken(oAuth2Client, callback);
		oAuth2Client.setCredentials(JSON.parse(token));
		if (module.parent)
			callback(oAuth2Client, path, f)
	});
}

function getAccessToken(oAuth2Client, callback) {
	const authUrl = oAuth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: SCOPES,
	});
	console.log('Authorize this app by visiting this url:', authUrl);
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	rl.question('Enter the code from that page here: ', (code) => {
		rl.close();
		oAuth2Client.getToken(code, (err, token) => {
			if (err) return console.error('Error retrieving access token', err);
			oAuth2Client.setCredentials(token);
			// Store the token to disk for later program executions
			fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
				if (err) return console.error(err);
				console.log('Token stored to', TOKEN_PATH);
			});
			callback(oAuth2Client);
		});
	});
}

function uploadFile(auth, path, f) {
	const drive = google.drive({version: 'v3', auth});
	console.log(path);

	var fileMetadata = {
		'name': path.match(/\/(.*)/)[1]
	};

	var media = {
		mimeType: 'text/calendar',
		body: fs.createReadStream(path)
	};

	drive.files.create({
		resource: fileMetadata,
		media: media,
		fields: 'id'

	}, function (err, file) {
		if (err) {
			console.error(err);
		} else {
			console.log('File Id: ', file.data.id);
			const ID = file.data.id;

			const permission = {
				'type': 'anyone',
				'role': 'reader'
			}

			drive.permissions.create({
				fileId: file.data.id,
				resource: permission,
				fields: 'id'

			}, function (err, permission) {
				if (err) {
					console.log(err);
				} else {
					console.log('Public');

					drive.files.get({
						fileId: ID,
						fields: 'webContentLink'

					}, function (err, file) {
						if (err) {
							console.log(err);
						} else {
							console.log(file.data.webContentLink);
							f(file.data.webContentLink);
						}
					})
				}
			})
		}
	});
}

if (!module.parent) {
    exports.sendMessage();
}