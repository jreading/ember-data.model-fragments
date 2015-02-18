import Transform from '../transform';

/**
  @module ember-data.model-fragments
*/

/**
  Transform for all fragment attributes which delegates work to
  fragment serializers.

  @class FragmentTransform
  @namespace DS
  @extends DS.Transform
*/
var FragmentTransform = Transform.extend({
  deserialize: function(data) {
    // TODO: figure out how to get a handle to the fragment type here
    // without having to patch `DS.JSONSerializer#applyTransforms`
    return data;
  },

  serialize: function(fragment) {
    // Because fragment properties are serialized when creating the owner
    // record's snapshot, it's already JSON at this point
    return fragment;
  }
});

export default FragmentTransform;
