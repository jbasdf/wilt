var React = require('react');

module.exports = React.createClass({

  render: function(){
    return (
      <button type="button">
        { this.props.name }
      </button>
    );
  }

});