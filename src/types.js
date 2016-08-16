import { PropTypes } from 'react';

export let storeShape = PropTypes.shape({
  subscribe: PropTypes.func.isRequired,
  dispatch: PropTypes.func.isRequired,
  initState: PropTypes.func.isRequired,
  getState: PropTypes.func.isRequired
});
