import React from 'react';
import { func, string, object } from 'prop-types';
import { ButtonToolbar, FormGroup, ControlLabel, FormControl } from 'react-bootstrap';
import Icon from 'react-fontawesome';
import clone from 'lodash.clonedeep';
import { omit } from 'ramda';
import CodeEditor from '../../components/CodeEditor';
import ModalItem from '../../components/ModalItem';

/* eslint-disable no-param-reassign */
/** Encode/decode UserData property of object */
const encodeUserData = (obj) => {
  if (obj && obj.UserData) {
    obj.UserData = window.btoa(JSON.stringify(obj.UserData));
  }
};

export default class WorkerTypeEditor extends React.PureComponent {
  static propTypes = {
    // Callback to be called with workerType operated on as parameter
    updated: func.isRequired,
    // WorkerType to update, null of none
    workerType: string,
    definition: object.isRequired
  };

  constructor(props) {
    super(props);

    this.state = this.getWorkerState(props);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.definition !== this.props.definition || nextProps.workerType !== this.props.workerType) {
      this.setState(this.getWorkerState(nextProps));
    }
  }

  getWorkerState(props) {
    const definition = this.cleanDefinition(clone(omit(['workerType'], props.definition)));

    return {
      workerType: props.workerType,
      definition: JSON.stringify(definition, null, 2),
      invalidDefinition: false
    };
  }

  handleChange = (e) => {
    try {
      JSON.parse(e.target.value);

      this.setState({
        definition: e.target.value,
        invalidDefinition: false
      });
    } catch (err) {
      this.setState({
        definition: e.target.value,
        invalidDefinition: true
      });
    }
  };

  workerTypeChange = value => this.setState({ workerType: value });

  workerTypeValidationState() {
    return /^[a-zA-Z0-9_-]{1,22}$/.test(this.state.workerType) ? 'success' : 'error';
  }

  cleanDefinition(original) {
    const definition = typeof original === 'string' ? JSON.parse(original) : original;

    /** * LEGACY NOTICE: This check and the actions it does are
     leftovers.  We'll soon be able to delete the check,
     the actions and the functions ***/
    if (definition.launchSpecification) {
      encodeUserData(definition.launchSpecification);
      definition.regions.forEach(({ overwrites }) => encodeUserData(overwrites));
      definition.instanceTypes.forEach(({ overwrites }) => encodeUserData(overwrites));
      /* END LEGACY */
    } else {
      delete definition.lastModified; // Remember that the provisioner api sets this
    }

    return definition;
  }

  save = async () => {
    const definition = this.cleanDefinition();

    await this.props.awsProvisioner.updateWorkerType(this.state.workerType, definition);
    await this.props.updated(this.state.workerType);
  };

  create = async () => {
    const definition = this.cleanDefinition();

    await this.props.awsProvisioner.createWorkerType(this.state.workerType, definition);
    await this.props.updated(this.state.workerType);
  };

  remove = async () => {
    await this.props.awsProvisioner.removeWorkerType(this.props.workerType);
    await this.props.updated(this.props.workerType);
  };

  render() {
    return (
      <div>
        {
          this.props.workerType ? (
            <h3>Update <code>{this.props.workerType}</code></h3>
          ) : (
            <FormGroup validationState={this.workerTypeValidationState()}>
              <ControlLabel>WorkerType</ControlLabel>
              <div>
                <FormControl
                  type="text"
                  placeholder="workerType"
                  value={this.state.workerType}
                  onChange={this.workerTypeChange} />
              </div>
            </FormGroup>
          )
        }
        <CodeEditor mode="json" value={this.state.definition} onChange={this.handleChange} />
        <br />

        <ButtonToolbar>
          <ModalItem
            button={true}
            disabled={this.state.invalidDefinition || this.workerTypeValidationState() === 'error'}
            onSubmit={this.props.workerType ? this.save : this.create}
            body={(
              <span>
                Are you sure that you would like to {this.props.workerType ? 'update' : 'create'} the
                <code>{this.state.workerType}</code> workerType?
                <br />
                If there is a minimum number of instances, they will be provisioned.
              </span>
            )}>
            <Icon name="check" /> {this.props.workerType ? 'Update WorkerType' : 'Create WorkerType'}
          </ModalItem>

          {this.props.workerType && (
            <ModalItem
              button={true}
              bsStyle="danger"
              disabled={this.state.invalidDefinition || this.workerTypeValidationState() === 'error'}
              onSubmit={this.remove}
              body={<span>Are you sure you want to delete the <code>{this.props.workerType}</code> workerType?</span>}>
              <Icon name="times" /> Remove WorkerType
            </ModalItem>
          )}
        </ButtonToolbar>
      </div>
    );
  }
}
