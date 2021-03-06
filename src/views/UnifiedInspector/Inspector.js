import React from 'react';
import { Switch } from 'react-router-dom';
import { LinkContainer } from 'react-router-bootstrap';
import { Row, Col, Nav, NavItem, Button } from 'react-bootstrap';
import Icon from 'react-fontawesome';
import { WebListener } from 'taskcluster-client';
import { isNil } from 'ramda';
import PropsRoute from '../../components/PropsRoute';
import Error from '../../components/Error';
import SearchForm from './SearchForm';
import ActionsMenu from './ActionsMenu';
import RunsMenu from './RunsMenu';
import LogsMenu from './LogsMenu';
import ArtifactList from '../../components/ArtifactList';
import HelmetTitle from '../../components/HelmetTitle';
import { loadable } from '../../utils';
import iconUrl from '../../taskcluster.png';

const GroupProgress = loadable(() => import(/* webpackChunkName: 'GroupProgress' */ './GroupProgress'));
const GroupDetails = loadable(() => import(/* webpackChunkName: 'GroupDetails' */ './GroupDetails'));
const TaskDetails = loadable(() => import(/* webpackChunkName: 'TaskDetails' */ './TaskDetails'));
const RunDetails = loadable(() => import(/* webpackChunkName: 'RunDetails' */ './RunDetails'));
const LogView = loadable(() => import(/* webpackChunkName: 'LogView' */ './LogView'));
const taskGroupItemKey = 'inspector-items-taskGroupId';
const taskItemKey = 'inspector-items-taskId';
const notifyKey = 'inspector-notify';
const PATHS = {
  TASK_LIST: '/groups/:taskGroupId',
  TASK_DETAILS: '/groups/:taskGroupId/tasks/:taskId/details',
  RUN_DETAILS: '/groups/:taskGroupId/tasks/:taskId/runs/:run',
  LOG: '/groups/:taskGroupId/tasks/:taskId/runs/:run/logs/:artifactId'
};
const initialLogs = [
  'public/logs/terminal.log',
  'public/logs/live.log'
];

export default class Inspector extends React.PureComponent {
  static defaultProps = {
    taskGroupId: null,
    taskId: null
  };

  constructor(props) {
    super(props);
    this.state = {
      tasks: null,
      selectedTaskId: null,
      status: null,
      task: null,
      artifacts: null,
      selectedRun: null,
      notify: 'Notification' in window && localStorage.getItem(notifyKey) === 'true'
    };
  }

  componentWillMount() {
    if (this.props.taskGroupId) {
      this.loadTasks(this.props);
    }

    if (this.props.taskId) {
      this.loadTask(this.props);
    }
  }

  componentWillUnmount() {
    if (this.taskListener) {
      this.taskListener.close();
      this.taskListener = null;
    }
  }

  componentWillReceiveProps(nextProps) {
    const { taskGroupId, taskId, runId } = nextProps;

    if (taskGroupId !== this.props.taskGroupId) {
      this.setState({
        selectedTaskId: null,
        status: null,
        task: null,
        artifacts: null,
        selectedRun: null,
        tasks: null
      });
    }

    if (taskGroupId) {
      this.loadTasks(nextProps);
    } else if (
      taskId &&
      (taskId !== this.state.selectedTaskId || (this.props.taskId && taskId !== this.props.taskId))
    ) {
      this.loadTask(nextProps);
    } else if (runId && runId !== this.props.runId) {
      this.setState({ selectedRun: runId });
    }
  }

  async loadTasks(props, token) {
    const { taskGroupId, queue } = props;

    if (!taskGroupId) {
      return;
    }

    this.updateLocalHistory(taskGroupId, taskGroupItemKey);

    try {
      const { tasks, continuationToken } = await queue
        .listTaskGroup(taskGroupId, token ? { continuationToken: token, limit: 100 } : { limit: 100 });

      this.setState({
        tasks: this.state.tasks ? this.state.tasks.concat(tasks) : tasks
      });

      if (continuationToken) {
        await this.loadTasks(props, continuationToken);
      }
    } catch (err) {
      this.setState({ error: err });
    }
  }

  async loadTask({ taskGroupId, taskId, history, sectionId, runId }) {
    if (!taskId || !taskGroupId) {
      return;
    }

    this.updateLocalHistory(taskId, taskItemKey);
    this.createTaskListener(taskId);

    try {
      const [status, task] = await Promise.all([this.getStatus(taskId), this.getTask(taskId)]);
      const runNumber = this.getRunNumber(runId, null, status.runs);
      const artifacts = await this.getArtifacts(taskId, runNumber);

      this.setState({
        selectedTaskId: taskId,
        status,
        task,
        artifacts,
        selectedRun: runNumber
      });

      if (!sectionId) {
        const logs = this.getLogsFromArtifacts(artifacts);
        const log = logs.find(({ name }) => initialLogs.includes(name)) || logs[0];

        history.replace(log ?
          `/groups/${taskGroupId}/tasks/${taskId}/runs/${runNumber}/logs/${encodeURIComponent(log.name)}` :
          `/groups/${taskGroupId}/tasks/${taskId}/details`);
      }
    } catch (err) {
      this.setState({
        error: err,
        status: null,
        task: null,
        artifacts: null
      });
    }
  }

  createTaskListener(taskId) {
    if (this.taskListener) {
      this.taskListener.close();
      this.taskListener = null;
    }

    if (!taskId) {
      return;
    }

    const { queueEvents } = this.props;
    const listener = new WebListener();
    const routingKey = { taskId };

    ['taskDefined', 'taskPending', 'taskRunning', 'artifactCreated', 'taskCompleted', 'taskFailed', 'taskException']
      .map(binding => listener.bind(queueEvents[binding](routingKey)));

    listener.on('message', this.handleTaskMessage);
    listener.resume();
    this.taskListener = listener;

    return listener;
  }

  handleRequestNotify = async () => {
    const notify = !this.state.notify;

    // If we are turning off notifications, or if the notification permission is already granted,
    // just change the notification state to the new value
    if (!notify || Notification.permission === 'granted') {
      localStorage.setItem(notifyKey, notify);
      return this.setState({ notify });
    }

    // Here we know the user is requesting to be notified, but has not yet granted permission
    const permission = await Notification.requestPermission();

    localStorage.setItem(notifyKey, permission === 'granted');
    this.setState({ notify: permission === 'granted' });
  };

  handleTaskMessage = ({ payload, exchange }) => {
    const { queueEvents, runId } = this.props;

    // Update status from message
    this.setState({ status: payload.status });

    // Give priority to exceptions to show without waiting for loop to happen
    if (exchange === queueEvents.taskException().exchange) {
      this.notify('A task exception occurred');
    } else if (exchange === queueEvents.taskFailed().exchange) {
      this.notify('A task failure occurred');
    }

    if (exchange !== queueEvents.artifactCreated().exchange) {
      return;
    }

    const { selectedRun } = this.state;
    const runNumber = this.getRunNumber(runId, selectedRun, payload.status.runs);

    // Check that runId matches this run or if artifacts haven't been loaded, we return
    if (payload.runId !== runNumber) {
      return;
    }

    const artifacts = [...(this.state.artifacts || [])];
    const index = artifacts.findIndex(artifact => payload.artifact.name === artifact.name);

    if (index === -1) {
      artifacts.push(payload.artifact);
    } else {
      artifacts[index] = payload.artifact;
    }

    // Add new artifact to collection, or update existing artifact
    this.setState({ artifacts });
  };

  navigate = (taskGroupId, taskId) => {
    if (!taskGroupId && taskId) {
      history.push(`/tasks/${taskId}`);
    } else if (taskGroupId && !taskId) {
      history.push(`/groups/${taskGroupId}`);
    } else if (!taskGroupId && !taskId) {
      history.push('/groups');
    } else {
      history.push(`/groups/${taskGroupId}/tasks/${taskId}`);
    }
  };

  handleSearch = ({ taskGroupId, taskId }) => {
    if (taskId === this.props.taskId && taskGroupId === this.props.taskGroupId) {
      // Return if nothing has changed
      return;
    }

    if (taskId !== this.props.taskId && taskGroupId !== this.props.taskGroupId) {
      this.navigate(taskGroupId, taskId);
    } else if (taskGroupId !== this.props.taskGroupId) {
      this.navigate(taskGroupId);
    } else {
      const { tasks } = this.state;
      const task = tasks && tasks.find(task => task.status.taskId === taskId);

      if (task) {
        this.navigate(this.props.taskGroupId, taskId);
      } else {
        this.navigate(null, taskId);
      }
    }
  };

  handleHighlight = (range) => {
    if (this.highlightRange && this.highlightRange.equals(range)) {
      return;
    }

    const first = range.first();
    const last = range.last();

    if (!first) {
      this.props.history.replace({ hash: '' });
    } else if (first === last) {
      this.props.history.replace({ hash: `#L${first}` });
    } else {
      this.props.history.replace({ hash: `#L${first}-${last}` });
    }

    this.highlightRange = range;
  };

  getLocalHistory(key) {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }

  async getStatus(taskId) {
    const { status } = await this.props.queue.status(taskId);

    return status;
  }

  getTask(taskId) {
    return this.props.queue.task(taskId);
  }

  async getArtifacts(taskId, runId) {
    const { artifacts } = await this.props.queue.listArtifacts(taskId, runId);

    return artifacts;
  }

  getLogsFromArtifacts(artifacts) {
    return artifacts.filter(({ name }) => /^public\/logs\//.test(name));
  }

  updateLocalHistory(id, localKey) {
    const ids = new Set(this.getLocalHistory(localKey).reverse());

    // If the id exists in the collection, remove it so we can push it to the end
    if (ids.has(id)) {
      ids.delete(id);
    }

    ids.add(id);

    // Keep the 5 most recent history items in the collection
    localStorage.setItem(localKey, JSON.stringify([...ids].slice(-5).reverse()));
  }

  handleEdit = task => this.props.history.push({
    pathname: '/tasks/create',
    state: { task }
  });

  handleRetrigger = taskId => this.navigate(this.props.taskGroupId, taskId);

  handleCreateInteractive = async taskId => this.props.history.push(`/tasks/${taskId}/connect`);

  getRunNumber(runId, selectedRun, runs) {
    if (!isNil(runId)) {
      return runId;
    }

    if (!isNil(selectedRun)) {
      return selectedRun;
    }

    if (runs.length) {
      return runs.length - 1;
    }

    return 0;
  }

  notify(message) {
    if (!this.state.notify) {
      return;
    }

    return new Notification('Taskcluster', {
      icon: iconUrl,
      body: message
    });
  }

  renderTaskGroup() {
    const { taskGroupId, taskId, queue, purgeCache, url, runId, sectionId, subSectionId, artifactId } = this.props;
    const { tasks, status, task, selectedTaskId, selectedRun, artifacts } = this.state;

    const trackedTaskId = taskId || selectedTaskId;
    const runNumber = this.getRunNumber(runId, selectedRun, status ? status.runs : []);
    const logs = artifacts && this.getLogsFromArtifacts(artifacts);
    const selectedLog = logs && logs.find(({ name }) => name === artifactId);

    return (
      <div>
        <Row style={{ marginBottom: 40, marginTop: 40 }}>
          <GroupProgress tasks={tasks} />
        </Row>

        <Row>
          <Nav bsStyle="tabs" activeHref={url} justified>
            <LinkContainer exact to={`/groups/${taskGroupId}`}>
              <NavItem>Task Group</NavItem>
            </LinkContainer>
            <LinkContainer to={`/groups/${taskGroupId}/tasks/${trackedTaskId}/details`} disabled={!trackedTaskId}>
              <NavItem>Task Details</NavItem>
            </LinkContainer>
            <ActionsMenu
              queue={queue}
              purgeCache={purgeCache}
              taskId={trackedTaskId}
              status={status}
              task={task}
              onRetrigger={this.handleRetrigger}
              onEdit={this.handleEdit}
              onCreateInteractive={this.handleCreateInteractive}
              onEditInteractive={this.handleEdit} />
            <RunsMenu
              taskGroupId={taskGroupId}
              taskId={trackedTaskId}
              status={status}
              runId={runNumber}
              active={sectionId === 'runs' && !subSectionId} />
            <LogsMenu
              logs={logs}
              taskGroupId={taskGroupId}
              taskId={trackedTaskId}
              runId={runNumber}
              active={subSectionId === 'logs'} />
            <ArtifactList
              queue={queue}
              taskId={trackedTaskId}
              artifacts={artifacts}
              runId={runNumber}
              menu={true} />
          </Nav>
        </Row>

        <Row>
          <Switch>
            <PropsRoute
              path={PATHS.LOG}
              component={LogView}
              queue={queue}
              taskId={taskId}
              runId={runId}
              status={status}
              log={selectedLog}
              highlight={this.props.highlight}
              onHighlight={this.handleHighlight} />
            <PropsRoute path={PATHS.RUN_DETAILS} component={RunDetails} run={status ? status.runs[runId] : null} />
            <PropsRoute path={PATHS.TASK_DETAILS} component={TaskDetails} status={status} task={task} />
            <PropsRoute path={PATHS.TASK_LIST} component={GroupDetails} taskGroupId={taskGroupId} tasks={tasks} />
          </Switch>
        </Row>
      </div>
    );
  }

  render() {
    const { taskGroupId, taskId } = this.props;
    const { task, error, selectedTaskId, notify } = this.state;

    const trackedTaskId = taskId || selectedTaskId;

    return (
      <div>
        <HelmetTitle title={`${task ? task.metadata.name : 'Task Inspector'}`} />
        <h4>Task &amp; Group Inspector</h4>
        <p>
          Given a task group ID or task ID, inspect task groups, monitor progress, view dependencies and states, and
          inspect individual tasks&rsquo; state, runs, public and private artifacts, definition, and logs as they are
          evaluated.
        </p>
        <hr />

        <Row>
          <Col xs={12}>
            <SearchForm
              onSearch={this.handleSearch}
              taskGroupId={taskGroupId}
              taskId={trackedTaskId}
              taskGroupHistory={this.getLocalHistory(taskGroupItemKey)}
              taskHistory={this.getLocalHistory(taskItemKey)} />
          </Col>
        </Row>

        {'Notification' in window ?
          (
            <Row>
              <Col xs={12}>
                <Button
                  bsSize="sm"
                  bsStyle="primary"
                  onClick={this.handleRequestNotify}
                  disabled={!('Notification' in window) || Notification.permission === 'denied'}>
                  <Icon name={notify ? 'check-square-o' : 'square-o'} />
                  &nbsp;&nbsp;Notify me on status changes
                </Button>
              </Col>
            </Row>
          ) :
          null
        }

        {error && <Error error={error} />}
        {taskGroupId && this.renderTaskGroup()}
      </div>
    );
  }
}
