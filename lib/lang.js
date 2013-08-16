// not part of canieat license... copyright (c) gadi cohen, contact me for terms of re-use

if (Meteor.isClient) {

	Session.setDefault('lang', 'en');
	Handlebars.registerHelper('getLang', function(field) {
		return getLang(this, field);
	});

	Handlebars.registerHelper('dir', function() {
		return Session.get('dir');
	});

	Handlebars.registerHelper('lang', function() {
		return Session.get('lang');
	});

	dir = 'ltr';
	Deps.autorun(function() {
		// TODO, better way to get direction
		var lang = Session.get('lang');
		dir = (jQuery.inArray(lang, ['he', 'ar']) == -1) ? 'ltr' : 'rtl';
		$('body').attr('dir', dir);
		Session.set('dir', 'rtl');
	});

	Meteor.startup(function() {
		$('body').attr('dir', dir);
	});
}

getLang = function(object, field) {
	var lang = Session.get('lang');
	var path = _.union(['trans', lang], field.split('.'));
	for (var i=0, out=object; out && i<path.length; i++)
		out = out[path[i]];
	if (!out) {
		path.splice(0, 2);
		for (var i=0, out=object; out && i<path.length; i++)
			out = out[path[i]];
	}
	return out || undefined;
}