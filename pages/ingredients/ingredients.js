if (Meteor.isClient) {
	Template.ingredients.ingredients = function() {
		return Ingredients.find({}, { sort: { name: 1} }).fetch();
	}
	Template['edit-ingredient'].props = templateProps;

	Template.ingredients.propNames = function() {
		return props;
	}

	Template.ingredients.props = function() {
		var prop, propObj, out = '';
		// TODO, escape

		for (var i=0; i < props.length; i++) {
			prop = props[i];
			out += '<td>';
			if (this.props && this.props[prop]) {
				propObj = this.props[props[i]];
				out += '<span title="'+propObj.note+'">' + propObj.status + '</span>';
				if (propObj.source)
					out += ' <a target="_blank" href="' + propObj.source + '">(?)</a>';
			}
			out += '</td>\n';
		}
		return new Handlebars.SafeString(out);
	}

	Template.ingredients.rendered = function() {
		$('#ingredients span[title]').tooltip();
	}

	Template['edit-ingredient-trans'].props = templatePropsTrans;

	Template.ingredients.events({
		'click a.edit': function() {
			var mTpl = Template['edit-ingredient'];
			mTpl.item = new Ingredient(this._id);

			modal({
				title: 'Edit Ingredient',
				body: function() { return new Handlebars.SafeString(mTpl()) }
			});
		},
	    'click a.edit-trans': function(event) {
	      var mTpl = Template['edit-ingredient-trans'];
	      mTpl.item = new Ingredient(this._id);

	      modal({title: mf('edit_ingredient_trans', null, 'Edit Ingredient Translation'),
	        body: function() { return new Handlebars.SafeString(mTpl()); }});
	    }		
	});

	Template['edit-ingredient'].rendered = function() {
		var mTpl = Template['edit-ingredient'];
		var editableSuccessTpl = _.partial(editableSuccess, mTpl.item);

		$('#edit-ingredient span[data-id="status"]').editable({
			source: allStatuses, emptytext: 'Unset', success: editableSuccessTpl
		});

		// anything that doesn't already have one
		$('#edit-ingredient span').editable({ success: editableSuccessTpl });

		$('#modalStandard .btn-primary').click(function() {
		  mTpl.item.save();
		});
	}
	Template['edit-ingredient-trans'].rendered = function() {
		var mTpl = Template['edit-ingredient-trans'];
		var editableSuccessTpl = _.partial(editableTransSuccess, mTpl.item);

		// anything that doesn't already have one
		$('#edit-ingredient-trans span').editable({ success: editableSuccessTpl });

		$('#modalStandard .btn-primary').click(function() {
		  mTpl.item.save();
		});		
	}

	transTemplate(Template['edit-ingredient-trans']);

}