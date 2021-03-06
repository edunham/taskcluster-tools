import React from 'react';
import { string, object } from 'prop-types';
import { Link } from 'react-router-dom';
import Spinner from '../../components/Spinner';
import DateView from '../../components/DateView';
import JsonInspector from '../../components/JsonInspector';

export default class EntryView extends React.PureComponent {
  static propTypes = {
    namespace: string.isRequired,
    namespaceTaskId: string,
    index: object.isRequired
  };

  constructor(props) {
    super(props);

    this.state = {
      task: null,
      error: null
    };
  }

  componentWillMount() {
    this.loadTask(this.props);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.namespace !== this.props.namespace || nextProps.namespaceTaskId !== this.props.namespaceTaskId) {
      this.loadTask(nextProps);
    }
  }

  async loadTask(props) {
    if (!props.namespace) {
      return this.setState({ error: null, task: {} });
    }

    try {
      this.setState({
        task: await props.index.findTask(props.namespaceTaskId ?
          `${props.namespace}.${props.namespaceTaskId}` :
          props.namespace),
        error: null
      });
    } catch (err) {
      this.setState({
        task: null,
        error: err
      });
    }
  }

  render() {
    return (
      <div>
        <h4>Indexed Task</h4>
        <hr />
        {this.renderTask()}
      </div>
    );
  }

  renderTask() {
    const { error, task } = this.state;

    if (error && error.statusCode === 404) {
      return (
        <div className="alert alert-warning" role="alert">
          <strong>Task not found!</strong>&nbsp;
          No task is indexed under <code>{this.props.namespace}</code>.
        </div>
      );
    }

    if (!task) {
      return <Spinner />;
    }

    if (Object.keys(task).length === 0) {
      return null;
    }

    return (
      <div>
        <dl className="dl-horizontal">
          <dt>Namespace</dt>
          <dd><code>{this.state.task.namespace}</code></dd>

          <dt>Rank</dt>
          <dd>{this.state.task.rank}</dd>

          <dt>Expires</dt>
          <dd><DateView date={this.state.task.expires} /></dd>

          <dt>TaskId</dt>
          <dd><Link to={`/tasks/${task.taskId}`}>{this.state.task.taskId}</Link></dd>
        </dl>
        <dl className="dl-horizontal">
          <dt>Data</dt>
          <dd>
            <JsonInspector data={this.state.task.data} />
          </dd>
        </dl>
      </div>
    );
  }
}
