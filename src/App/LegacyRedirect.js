import React from 'react';
import { Redirect } from 'react-router-dom';
import NotFound from '../components/NotFound';

const LegacyRedirect = (props) => {
  switch (props.path) {
    case '/task-group-inspector':
    case '/task-graph-inspector':
    case '/push-inspector': {
      const [groupId, taskId] = props.location.hash.slice(2).split('/');

      if (!groupId && !taskId) {
        return <Redirect to={'/groups'} />;
      }

      if (!taskId) {
        return <Redirect to={`/groups/${groupId}`} />;
      }

      return <Redirect to={`/groups/${groupId}/tasks/${taskId}`} />;
    }

    case '/task-inspector': {
      return <Redirect to={`/tasks/${props.location.hash.slice(1)}`} />;
    }

    case '/task-creator': {
      return <Redirect to={'/tasks/create'} />;
    }

    case '/one-click-loaner': {
      return props.location.hash ?
        <Redirect to={`/tasks/${props.location.hash.slice(1)}/create`} /> :
        <Redirect to="/groups" />;
    }

    case '/interactive': {
      return <Redirect to={{ pathname: '/shell', search: props.location.search }} />;
    }

    default: {
      return <NotFound />;
    }
  }
};

export default LegacyRedirect;
