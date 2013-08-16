Products = new Meteor.Collection('products');
Ingredients = new Meteor.Collection('ingredients');
Companies = new Meteor.Collection('companies');
Categories = new Meteor.Collection('categories');

props = ['vegan'];
statuses = ['yes', 'no', 'maybe'];
allStatuses = [
	{ id: '', text: '' },
	{ id: 'no', text: 'No' },
	{ id: 'maybe', text: 'Maybe' },
	{ id: 'yes', text: 'Yes' }
];

Product = baseDb.extend({
	collection: Products,
	schema: {
		       name: { },
		    company: { type: 'array' },
		     picURL: { },
		    barcode: { },
		 categories: { type: 'array' },
		ingredients: { type: 'array' },
		      props: { type: 'object' },
		       lang: { },
		      trans: { type: 'object' }
	}
});

Ingredient = baseDb.extend({
	collection: Ingredients,
	schema: {
	     name: { },
	    props: { type: 'object' }
	}
});

if (Meteor.isClient) {
	var subs = ['products', 'ingredients', 'categories', 'companies'];
	allSubs = {};
	_.each(subs, function(sub) {
		allSubs[sub] = Meteor.subscribe(sub);
	});
} else {
	Meteor.publish('products', function() {
		return Products.find();
	});
	Meteor.publish('ingredients', function() {
		return Ingredients.find();
	});
	Meteor.publish('categories', function() {
		return Categories.find();
	});
	Meteor.publish('companies', function() {
		return Companies.find();
	})
}