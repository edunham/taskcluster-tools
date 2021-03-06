import React from 'react';
import { func } from 'prop-types';
import {
  Alert, OverlayTrigger, Tooltip, Modal, FormGroup, ControlLabel, FormControl, Button, Glyphicon, ButtonToolbar
} from 'react-bootstrap';
import moment from 'moment';
import { assoc } from 'ramda';
import Icon from 'react-fontawesome';
import Spinner from '../../components/Spinner';
import TimeInput from '../../components/TimeInput';
import ModalItem from '../../components/ModalItem';
import Markdown from '../../components/Markdown';
import DateView from '../../components/DateView';
import ScopeEditor from '../../components/ScopeEditor';

export default class ClientEditor extends React.PureComponent {
  static propTypes = {
    // Method to reload a client in the parent
    reloadClients: func.isRequired
  };

  static defaultProps = {
    // '' implies. "Create Client"
    currentClientId: ''
  };

  constructor(props) {
    super(props);

    this.state = {
      // Loading client or loaded client
      client: null,
      // Edit or viewing current state
      editing: true,
      // Operation details, if currently doing anything
      working: false,
      error: null,
      showModal: true
    };
  }

  componentWillMount() {
    this.load(this.props);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.currentClientId !== this.props.currentClientId) {
      this.load(nextProps);
    }
  }

  async load(props) {
    // If there is no currentClientId, we're creating a new client
    if (props.currentClientId === '') {
      const { credentials } = props;
      const clientId = credentials ? `${credentials.clientId}/` : '';

      return this.setState({
        client: {
          clientId,
          expires: new Date(3017, 1, 1),
          description: '',
          scopes: [],
          expandedScopes: []
        },
        accessToken: null,
        editing: true,
        working: false,
        error: null
      });
    }

    // Load currentClientId, but avoid doing so after creating a new client
    if (this.state.client && this.state.client.clientId === props.currentClientId) {
      this.setState({
        editing: false,
        working: false,
        error: null
      });
    }

    try {
      this.setState({
        client: await props.auth.client(props.currentClientId),
        accessToken: null,
        editing: false,
        working: false,
        error: null
      });
    } catch (err) {
      this.setState({
        client: null,
        error: err
      });
    }
  }

  render() {
    if (this.state.error && !this.state.client) {
      return (
        <Alert bsStyle="danger" onDismiss={this.dismissError}>
          <strong>Error executing operation</strong> {this.state.error.toString()}
        </Alert>
      );
    }

    const isCreating = this.props.currentClientId === '' && this.state.accessToken === null;
    const isEditing = (isCreating || this.state.editing);
    let title = 'Create New Client';

    if (!isCreating) {
      title = isEditing ? 'Edit Client' : 'View Client';
    }

    const creds = this.props.credentials;
    const clientId = creds ? `${creds.clientId}/` : '';
    const tooltip = (
      <Tooltip id="clientId">
        You can create as many clients as you would like that begin with &quot;{clientId}&quot;.
      </Tooltip>
    );

    if (!this.state.client) {
      return <Spinner />;
    }

    return (
      <div className="client-editor">
        <h4 style={{ marginTop: 0 }}>{title}</h4>
        <hr style={{ marginBottom: 10 }} />
        {this.state.error && (
          <Alert bsStyle="danger" onDismiss={this.dismissError}>
            <strong>Error executing operation</strong> {this.state.error.toString()}
          </Alert>
        )}
        <div className="form-horizontal">
          {
            isCreating ? (
              <OverlayTrigger
                placement="bottom"
                trigger="focus"
                defaultOverlayShown={clientId !== ''}
                overlay={tooltip}>
                <FormGroup validationState={this.validClientId() ? 'success' : 'error'}>
                  <ControlLabel className="col-md-3">ClientId</ControlLabel>
                  <div className="col-md-9">
                    <FormControl
                      type="text"
                      placeholder="ClientId"
                      value={this.state.client.clientId}
                      onChange={this.onClientIdChange} />
                    <FormControl.Feedback />
                  </div>
                </FormGroup>
              </OverlayTrigger>
            ) : (
              <div className="form-group">
                <label className="control-label col-md-3">ClientId</label>
                <div className="col-md-9">
                  <div className="form-control-static">
                    {this.state.client.clientId}
                  </div>
                </div>
              </div>
            )
          }
          {
            this.state.client.disabled ? (
              <div className="form-group">
                <label className="control-label col-md-3">Disabled</label>
                <div className="col-md-9">
                  This client is disabled
                </div>
              </div>
            ) :
              null
          }
          {
            (isEditing && !isCreating) || this.state.accessToken !== null ? (
              <div className="form-group">
                {(() => {
                  if (isEditing && !isCreating) {
                    return (
                      <div>
                        <label className="control-label col-md-3">AccessToken</label>
                        <div className="col-md-9">
                          <Button
                            bsStyle="warning"
                            onClick={this.resetAccessToken}
                            disabled={this.state.working}>
                            <Glyphicon glyph="fire" /> Reset accessToken
                          </Button>
                        </div>
                      </div>
                    );
                  }

                  if (this.state.accessToken != null) {
                    return (
                      <Modal show={this.state.showModal} onHide={this.closeDialog}>
                        <Modal.Header closeButton={true}>Access Token</Modal.Header>
                        <Modal.Body>
                          <p>The access token for this clientId is:</p>
                          <code>{this.state.accessToken}</code>
                        </Modal.Body>
                      </Modal>
                    );
                  }
                })()}
              </div>
            ) :
              null
          }
          <div className="form-group">
            <label className="control-label col-md-3">Description</label>
            <div className="col-md-9">
              {isEditing ? this.renderDescEditor() : this.renderDesc()}
            </div>
          </div>
          <div className="form-group">
            <label className="control-label col-md-3">Expires</label>
            <div className="col-md-9">
              {
                isEditing ? (
                  <TimeInput
                    format="YYYY-MM-DD HH:mm:ss ZZ"
                    value={moment(new Date(this.state.client.expires))}
                    onChange={this.onExpiresChange}
                    className="form-control" />
                ) : (
                  <div className="form-control-static">
                    <DateView date={this.state.client.expires} />
                    {
                      this.state.client.deleteOnExpiration && (
                        <span> (this client will be deleted on expiration)</span>
                      )
                    }
                  </div>
                )
              }
            </div>
          </div>
          {
            isEditing && (
              <div className="form-group">
                <label className="control-label col-md-3">Delete on Expiration</label>
                <div className="col-md-9">
                  <input
                    type="checkbox"
                    checked={this.state.client.deleteOnExpiration}
                    onChange={this.onDOEChange} />
                  {' '}Automatically delete this client when it expires
                </div>
              </div>
            )
          }
          {
            Object
              .entries({
                created: 'Created',
                lastModified: 'Last Modified',
                lastDateUsed: 'Last Date Used',
                lastRotated: 'Last Rotated'
              })
              .map(([prop, label]) => {
                if (!this.state.client[prop]) {
                  return null;
                }

                return (
                  <div className="form-group" key={prop}>
                    <label className="control-label col-md-3">{label}</label>
                    <div className="col-md-9">
                      <div className="form-control-static">
                        <DateView date={this.state.client[prop]} />
                      </div>
                    </div>
                  </div>
                );
              })
              .filter(Boolean)
          }
          <div className="form-group">
            <label className="control-label col-md-3">Client Scopes</label>
            <div className="col-md-9">
              <ScopeEditor
                editing={isEditing}
                scopes={this.state.client.scopes}
                scopesUpdated={this.onScopesUpdated} />
            </div>
          </div>
          {
            !isEditing && !isCreating ? (
              <div className="form-group">
                <label className="control-label col-md-3">Expanded Scopes</label>
                <div className="col-md-9">
                  <span className="text-muted">Expanded scopes are determined from the client
                    scopes, expanding roles for scopes beginning with <code>assume:</code>.
                  </span>
                  <ScopeEditor scopes={this.state.client.expandedScopes} />
                </div>
              </div>
            ) :
              null
          }
          <hr />
          <div className="form-group">
            <div className="col-md-9 col-md-offset-3">
              <div className="form-control-static">
                {(() => {
                  if (isEditing) {
                    return isCreating ?
                      this.renderCreatingToolbar() :
                      this.renderEditingToolbar();
                  }

                  return (
                    <ButtonToolbar>
                      <Button
                        bsStyle="success"
                        onClick={this.startEditing}
                        disabled={this.state.working}>
                        <Glyphicon glyph="pencil" /> Edit Client
                      </Button>
                    </ButtonToolbar>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /** Determine if clientId is valid */
  validClientId = () => /^[A-Za-z0-9@/:._-]+$/.test(this.state.client.clientId || '');

  /** Render editing toolbar */
  renderEditingToolbar() {
    return (
      <ButtonToolbar>
        <Button bsStyle="success" onClick={this.saveClient} disabled={this.state.working}>
          <Glyphicon glyph="ok" /> Save Changes
        </Button>
        <ModalItem
          button={true}
          disabled={this.state.working}
          onSubmit={this.deleteClient}
          body={(
            <span>
              Are you sure you want to delete credentials with client ID <code>{this.state.client.clientId}</code>?
            </span>
          )}>
          <Icon name="trash" /> Delete Client
        </ModalItem>
        {
          this.state.client.disabled ? (
            <ModalItem
              button={true}
              bsStyle="warning"
              disabled={this.state.working}
              onSubmit={this.enableClient}
              onComplete={() => this.load(this.props)}
              body={(
                <span>
                  Are you sure you want to enable client ID <code>{this.state.client.clientId}</code>?
                </span>
              )}>
              <Icon name="check-circle-o" /> Enable Client
            </ModalItem>
          ) : (
            <ModalItem
              button={true}
              bsStyle="warning"
              disabled={this.state.working}
              onSubmit={this.disableClient}
              onComplete={() => this.load(this.props)}
              body={(
                <span>
                  Are you sure you want to disable client ID <code>{this.state.client.clientId}</code>?
                </span>
              )}>
              <Icon name="times-circle-o" /> Disable Client
            </ModalItem>
          )
        }
      </ButtonToolbar>
    );
  }

  /** Render creation toolbar */
  renderCreatingToolbar() {
    return (
      <ButtonToolbar>
        <Button
          bsStyle="primary"
          onClick={this.createClient}
          disabled={this.state.working || !this.validClientId()}>
          <Glyphicon glyph="plus" /> Create Client
        </Button>
      </ButtonToolbar>
    );
  }

  /** Render description editor */
  renderDescEditor() {
    return (
      <textarea
        className="form-control"
        value={this.state.client.description}
        onChange={this.onDescriptionChange}
        rows={8}
        placeholder="Description in markdown..." />
    );
  }

  /** Render description */
  renderDesc() {
    return (
      <div className="form-control-static">
        <Markdown>{this.state.client.description}</Markdown>
      </div>
    );
  }

  onDescriptionChange = e => this.setState({
    client: assoc('description', e.target.value, this.state.client)
  });

  onClientIdChange = e => this.setState({
    client: assoc('clientId', e.target.value, this.state.client)
  });

  onScopesUpdated = scopes => this.setState({
    client: assoc('scopes', scopes, this.state.client)
  });

  /** When expires exchanges in the editor */
  onExpiresChange = date => this.setState({
    client: assoc('expires', date.toDate().toJSON(), this.state.client)
  });

  onDOEChange = () => this.setState({
    client: assoc('deleteOnExpiration', !this.state.client.deleteOnExpiration, this.state.client)
  });

  /** Reset accessToken for current client */
  resetAccessToken = async () => {
    try {
      const client = await this.props.auth.resetAccessToken(this.state.client.clientId);

      this.setState({
        client,
        accessToken: client.accessToken,
        editing: false,
        working: false
      });
    } catch (err) {
      this.setState({
        working: false,
        error: this.props.credentials ?
          'You do not have sufficient permission to reset access tokens for this user.' :
          'You must be logged in and have permission to reset access tokens for this user.'
      });
    }
  };

  /** Close modal */
  closeDialog = () => this.setState({ accessToken: null });

  /** Start editing */
  startEditing = () => this.setState({ editing: true });

  /** Create new client */
  createClient = async () => {
    this.setState({ working: true });

    try {
      const clientId = this.state.client.clientId;
      const client = await this.props.auth.createClient(clientId, {
        description: this.state.client.description,
        expires: this.state.client.expires,
        scopes: this.state.client.scopes
      });

      this.setState({
        client,
        accessToken: client.accessToken,
        editing: false,
        working: false,
        error: null
      });

      this.props.reloadClients();
    } catch (err) {
      this.setState({
        working: false,
        error: err
      });
    }
  };

  /** Save current client */
  saveClient = async () => {
    try {
      const clientId = this.state.client.clientId;
      const client = await this.props.auth.updateClient(clientId, {
        description: this.state.client.description,
        expires: this.state.client.expires,
        scopes: this.state.client.scopes,
        deleteOnExpiration: this.state.client.deleteOnExpiration
      });

      this.props.reloadClients();

      this.setState({
        editing: false,
        client
      });
    } catch (err) {
      this.setState({
        error: err
      });
    }
  };

  /** Delete current client */
  deleteClient = async () => {
    try {
      const clientId = this.state.client.clientId;

      await this.props.deleteClient(clientId);
    } catch (err) {
      this.setState({
        error: err
      });
    }
  };

  disableClient = async () => {
    try {
      const clientId = this.state.client.clientId;

      await this.props.auth.disableClient(clientId);
    } catch (err) {
      this.setState({ error: err });
    }
  };

  enableClient = async () => {
    try {
      const clientId = this.state.client.clientId;

      await this.props.auth.enableClient(clientId);
    } catch (err) {
      this.setState({ error: err });
    }
  };

  /** Reset error state from operation*/
  dismissError = () => this.setState({
    working: false,
    error: null
  });
}
