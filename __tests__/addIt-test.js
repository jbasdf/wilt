jest.dontMock('../addit');

describe('addIt', function(){
  it('adds two numbers', function(){
    var addIt = require('../addit');
    expect(addIt(3,2)).toBe(5);
  });
});