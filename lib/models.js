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
	schema: {
		       name: { },
		    company: { type: 'array' },
		     picURL: { },
		    barcode: { },
		 categories: { type: 'array' },
		ingredients: { type: 'array' },
		      props: { type: 'object' }
	},
	init: function(obj) {
		this.collection = Products;
		this._super(obj);
	}
});
