/*
 * If a user signs in using a service type for the first time, but we already have
 * an existing record for them, merge the records, don't create a seperate one.
 *
 * Additionally, use their github username as a profile name
 */

function fillFromMissing(user, source, service) {
	if (!user.profile)
		user.profile = {};

	if (service == 'github') {
		if (!user.profile.name)
			user.profile.name = user.services[service].username;
	} else if (service == 'facebook') {
		if (!user.profile.name)
			user.profile.name = user.services[service].username;
	} else if (service == 'google') {
		if (!user.profile.name)
			user.profile.name = user.services[service].name;
	}
}

if (Meteor.isServer) {

	Accounts.onCreateUser(function(options, user) {
		if (user.services) {
			var service = _.keys(user.services)[0];
			var email = user.services[service].email;

			if (!email)
				return user;

			// see if any existing user has this email address, otherwise create new
			var existingUser = Meteor.users.findOne({'emails.address': email});

			if (!existingUser) {
				// new user, fill in first time stuff
				if (!user.emails)
					user.emails = { address: email };
				fillFromMissing(user, user, service);
				return user;
			}

			fillFromMissing(existingUser, user, service);

			// precaution, these will exist from accounts-password if used
			if (!existingUser.services)
				existingUser.services = { resume: { loginTokens: [] }};
			if (!existingUser.services.resume)
				existingUser.services.resume = { loginTokens: [] };

			// copy accross new service info
			existingUser.services[service] = user.services[service];
			existingUser.services.resume.loginTokens.push(
				user.services.resume.loginTokens[0]
			);

			// even worse hackery
			Meteor.users.remove({_id: existingUser._id}); // remove existing record
			return existingUser;						  // record is re-inserted
		}
	});

} else { // isClient

/*
	Meteor.loginWithGithub({
	  requestPermissions: ['user', 'user:email']
	}, function (err) {
		if (err) {
	  	console.log('Github error: ' + (err.reason || 'Unknown error'));
	  	console.log(err);
	  }
	});
*/
}
