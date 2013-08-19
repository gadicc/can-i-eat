// not part of canieat license... copyright (c) gadi cohen, contact me for terms of re-use

if (Meteor.isClient) {

	Session.setDefault('lang', 'en');
	Handlebars.registerHelper('getLang', function(field, lang, noFallback) {
		if (!_.isString(lang)) lang = undefined;  // undo handlebars hash obj
		return getLang(this, field, lang, noFallback);
	});

	Handlebars.registerHelper('dir', function() {
		return Session.get('dir');
	});

	Handlebars.registerHelper('lang', function() {
		return Session.get('lang');
	});

	Handlebars.registerHelper('langsButCurrent', function() {
		var current = this.lang || Session.get('lang');
		return Lang.allButCurrent(current);
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

	transTemplate = function(tpl) {
		// rendered: set the select to correct destLang
		var oldRendered = tpl.rendered;
		tpl.rendered = function() {
			if (oldRendered) oldRendered();
			var options = Lang.allButCurrent(tpl.item.lang);
			var destLang = Session.get('destLang');
			if (!destLang || options.indexOf(destLang) != -1) {
				destLang = options[0];
				Session.set('destLang', destLang);
			}
			$('#edit-product-trans select').val(destLang);		
		}

		// events: observe changes to destLang
		tpl.events({
			'change select': function(event) {
			  Session.set('destLang', $(event.target).val());
			}		
		});
	}

	Handlebars.registerHelper('destLang', function() {
		return Session.get('destLang');
	});
}

getLang = function(object, field, lang, noFallback) {
	if (!lang) lang = Session.get('lang');
	var path = _.union(['trans', lang], field.split('.'));
	for (var i=0, out=object; out && i<path.length; i++)
		out = out[path[i]];
	if (!out && !noFallback) {
		path.splice(0, 2);
		for (var i=0, out=object; out && i<path.length; i++)
			out = out[path[i]];
	}
	return out || undefined;
}

Lang = {
	native: 'en',
	all: function() {
		return _.keys(MessageFormatCache.compiled);
	},
	allButCurrent: function(current) {
		if (!current) current = Session.get('lang');
		return _.without(this.all(), current);
	},
	getDot: function(obj, key) {
		var out, path = key.split('.');
		for (var i=0, out=obj; out && i<path.length; i++)
			out = out[path[i]];
		return out;
	},
	dotStore: function(obj, key, value) {
		var path = key.split('.'), ptr;
		for (var i=0, ptr = obj; i < path.length-1; i++) {
			if (!ptr[path[i]])
				ptr[path[i]] = {};
			ptr = ptr[path[i]];
		}
		ptr[path[i]] = value;
	},
	extractKeys: function(obj, keys) {
		var val, out = {}, key;
		for (var i=0; i < keys.length; i++) {
			key = keys[i];
			val = this.getDot(obj, key);
			if (val)
				this.dotStore(out, key, val);
		};
		return out;
	},
	colM1toM2: function(collection, xls) {
		var self = this;
		var lang, text, docs = collection.find().fetch();
		_.each(docs, function(doc) {
			lang = doc.lang || self.native;
			text = [ { lang: lang, strings: self.extractKeys(doc, xls) } ];
			for (lang in doc.trans)
				text.push( { lang: lang, strings: self.extractKeys(doc.trans[lang], xls) } );
			console.log(doc._id, { $set: { text: text }, $unset: self.extractKeys(doc, xls) });
		});
	}
};

LangM1 = {
	// note, funcs act on the object.  return it just in case, but either way, obj is modified.
	flatten: function(obj, lang) {
		if (!lang) lang = Session.get('lang');
		if (obj.trans && obj.trans[lang])
			$.extend(true, obj, obj.trans[lang]);
		return obj;
	},
	flattenCol: function(col, lang) {
		if (!lang) lang = Session.get('lang');
		for (var i=0; i < col.length; i++)
			this.flatten(col[i]);
		return col;
	}
};

/*


compare: db text search, get default text, note native lang.
how to get native lang and matching translations
how to only get relevant languages for user
how to update single language
text sort??

METHOD 1:

projection is easy, obj.trans.he, etc.


METHOD 2:

obj {
	
	text: {
		[ lang: 'he', strings: {} ]
	}
}

pros:

* mongo search for text.strings.
* no need to maintain a list of translateable fields
* text[0].strings will always be native
* text[0].lang is the objects native lang
* update( { _id: x, 'text.lang': 'he' }, {$set: { 'text.$.strings': newValue }}
// http://docs.mongodb.org/manual/core/update/#update-arrays
* easy to get native if match or xls otherwise (obj.text.lang = lang.  projection: obj.text???)
// http://docs.mongodb.org/manual/reference/projection/elemMatch/#proj._S_elemMatch
// db.schools.find( { zipcode: 63109 },
//                 { students: { $elemMatch: { school: 102 } } } )
* add, $push

{ $sort: { text. } }
// http://stackoverflow.com/questions/5315658/mongodb-sort-documents-by-array-objects
but i want to sort by specific element in array!  array el for current language. OR e;[0].  wow, that's pretty hard :)
but can sort on client if we give up the cursor for livedata
and do highlight at same time.
so 1) query relevant lang data, 2) combine,sort,highlight, 3) simpler {{name}}s
queryLangify(query);

cons:

* slower(?) to pick a specific lang

q's:

* do we want to store translation data?  author, ctime/mtime, etc.  YES  store it here?  maybe.



can make a class that will autosave the trans values to the correct location.
class can make i18n transparent, using getters and setters.
   or with langSet, langGet for text (better) (with dot notation support)
method to merge into a single object with no text:{} field.

eventually:
track out of date translations, show diff of changes in native lang to help translators

*/