var env, store, Person, Name;
var all = Ember.RSVP.all;

module("unit/fragments - DS.ModelFragment", {
  setup: function() {
    Person = DS.Model.extend({
      name: DS.hasOneFragment("name")
    });

    Name = DS.ModelFragment.extend({
      first : DS.attr("string"),
      last  : DS.attr("string")
    });

    env = setupStore({
      person: Person,
      name: Name
    });

    store = env.store;
  },

  teardown: function() {
    env = null;
    store = null;
    Person = null;
    Name = null;
  }
});

test("fragments are `Ember.Copyable`", function() {
  var fragment = store.createFragment('name');

  ok(Ember.Copyable.detect(fragment), "fragments are copyable");
});

test("copied fragments can be added to any record", function() {
  store.push(Person, {
    id: 1,
    name: {
      first: "Jon",
      last: "Snow"
    }
  });

  store.push(Person, { id: 2 });

  all([
    store.find(Person, 1),
    store.find(Person, 2)
  ]).then(async(function(people) {
    var copy = people[0].get('name').copy();

    people[1].set('name', copy);

    ok(true, "fragment copies can be assigned to other records");
  }));
});

test("fragments are `Ember.Comparable`", function() {
  var fragment = store.createFragment('name');

  ok(Ember.Comparable.detect(fragment), "fragments are comparable");
});

test("fragments are compared by reference", function() {
  var fragment1 = store.createFragment('name', {
    first: "Jon",
    last: "Arryn"
  });
  var fragment2 = store.createFragment('name', {
    first: "Jon",
    last: "Arryn"
  });

  ok(fragment1.compare(fragment1, fragment2) !== 0, "deeply equal objects are not the same");
  ok(fragment1.compare(fragment1, fragment1) === 0, "identical objects are the same");
});

test("changes to fragments are indicated in the owner record's `changedAttributes`", function() {
  store.push(Person, {
    id: 1,
    name: {
      first: "Loras",
      last: "Tyrell"
    }
  });

  store.find(Person, 1).then(async(function(person) {
    var name = person.get('name');

    name.set('last', 'Baratheon');

    equal(person.changedAttributes().name, true, "changed fragments are indicated in the diff object");
  }));
});

test("fragment properties that are set to null are indicated in the owner record's `changedAttributes`", function() {
  store.push(Person, {
    id: 1,
    name: {
      first: "Rob",
      last: "Stark"
    }
  });

  store.find(Person, 1).then(async(function(person) {
    person.set('name', null);

    equal(person.changedAttributes().name, true, "null fragments are indicated in the diff object");
  }));
});

test("changes to attributes can be rolled back", function() {
  store.push(Person, {
    id: 1,
    name: {
      first: "Ramsay",
      last: "Snow"
    }
  });

  store.find(Person, 1).then(async(function(person) {
    var name = person.get('name');

    name.set('last', 'Bolton');
    name.rollback();

    ok(name.get('last', 'Snow'), "fragment properties are restored");
    ok(!name.get('isDirty'), "fragment is in clean state");
  }));
});

test("fragment properties are serialized as normal attributes using their own serializers", function() {
  // TODO: this is necessary to set `typeKey` and prevent `store#serializerFor` from blowing up
  store.modelFor('person');

  store.push('person', {
    id: 1,
    name: {
      first: "Aerys",
      last: "Targaryen"
    }
  });

  env.container.register('serializer:name', DS.JSONSerializer.extend({
    serialize: function() {
      return 'Mad King';
    }
  }));

  store.find('person', 1).then(async(function(person) {
    var name = person.get('name');

    var serialized = person.serialize();

    equal(serialized.name, 'Mad King', "serialization uses result from `fragment#serialize`");
  }));
});

test("fragment properties are serialized as normal attributes on the snapshot", function() {
  expect(6);

  // TODO: this is necessary to set `typeKey` and prevent `store#serializerFor` from blowing up
  store.modelFor('person');

  var House = DS.ModelFragment.extend({
    name   : DS.attr("string"),
    region : DS.attr("string"),
    exiled : DS.attr("boolean")
  });

  Person.reopen({
    houses   : DS.hasManyFragments(House),
    children : DS.hasManyFragments()
  });

  var person = {
    id: 1,
    name: {
      first : "Catelyn",
      last  : "Stark"
    },
    houses: [
      {
        name   : "Tully",
        region : "Riverlands",
        exiled : true
      },
      {
        name   : "Stark",
        region : "North",
        exiled : true
      }
    ],
    children: [
      'Robb',
      'Sansa',
      'Arya',
      'Brandon',
      'Rickon'
    ]
  };

  store.push('person', person);

  env.container.register('serializer:person', DS.JSONSerializer.extend({
    serialize: function(snapshot) {
      ok(!(name instanceof DS.ModelFragment), "`hasOneFragment` attribute is not a model fragment");
      deepEqual(snapshot.attr('name'), person.name, "`hasOneFragment` attribute is serialized");
      ok(!(name instanceof DS.FragmentArray), "`hasManyFragments` attribute is not a fragment array");
      deepEqual(snapshot.attr('houses'), person.houses, "`hasManyFragments` attribute is serialized");
      ok(!(name instanceof Ember.ArrayProxy), "`hasManyFragments` attribute is not an array proxy");
      deepEqual(snapshot.attr('children'), person.children, "`hasManyFragments` attribute is serialized");
    }
  }));

  return store.find('person', 1).then(function(person) {
    person.serialize();
  });
});