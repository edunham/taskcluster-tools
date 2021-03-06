export default [
  {
    title: 'Task & Group Inspector',
    link: '/groups',
    icon: 'cubes',
    description: `Inspect task groups, monitor progress, view dependencies and states, and inspect the individual tasks
      that make up a task group. Inspect the state, runs, public and private artifacts, definition, and logs of
      tasks as they are evaluated.`
  },
  {
    title: 'Task Creator',
    link: '/tasks/create',
    icon: 'pencil-square-o',
    description: `Create and submit tasks to Taskcluster. Created tasks will be saved so you can come back and
      experiment with variations.`
  },
  {
    title: 'GitHub Quick-Start',
    link: '/quickstart',
    icon: 'github',
    description: 'Create a `.taskcluster.yml` configuration file and plug Taskcluster into your repository.'
  },
  {
    title: 'AWS Provisioner',
    link: '/aws-provisioner',
    icon: 'server',
    description: 'Manage worker types known to the AWS Provisioner and check on the status of AWS nodes.'
  },
  {
    title: 'Client Manager',
    link: '/auth/clients/',
    icon: 'users',
    description: `Manage clients on \`auth.taskcluster.net\`. This tool allows you to create, modify
      and delete clients. You can also reset \`accessToken\` and explore indirect scopes.`
  },
  {
    title: 'Role Manager',
    link: '/auth/roles/',
    icon: 'shield',
    description: `Manage roles on \`auth.taskcluster.net\`. This tool allows you to create, modify
      and delete roles. You can also manage scopes and explore indirect scopes.`
  },
  {
    title: 'Scope Inspector',
    link: '/auth/scopes/',
    icon: 'graduation-cap',
    description: `Explore scopes on \`auth.taskcluster.net\`. This tool allows you to find roles and
      clients with a given scope. This is effectively reverse client and role lookup.`
  },
  {
    title: 'Pulse Inspector',
    link: '/pulse-inspector',
    icon: 'wifi',
    description: `Bind to Pulse exchanges in your browser, observe messages arriving and inspect
      messages. Useful when debugging and working with undocumented Pulse exchanges.`
  },
  {
    title: 'Cache Purge Inspector',
    link: '/purge-caches',
    icon: 'bolt',
    description: 'View currently active cache purges and schedule a new one if needed.'
  },
  {
    title: 'Index Browser',
    link: '/index',
    icon: 'sitemap',
    description: `The generic index browser lets you browse through the hierarchy of namespaces in
      the index, and discover indexed tasks.`
  },
  {
    title: 'Indexed Artifact Browser',
    link: '/index/artifacts/',
    icon: 'folder-open',
    description: `The indexed artifact browser lets you easily view the artifacts from the latest
      run of an indexed task.`
  },
  {
    title: 'Hooks Manager',
    link: '/hooks',
    icon: 'repeat',
    description: 'Manage hooks: tasks that are created in response to events within Taskcluster.'
  },
  {
    title: 'Secrets Manager',
    link: '/secrets',
    icon: 'user-secret',
    description: 'Manage secrets: values that can only be retrieved with the appropriate scopes.'
  },
  {
    title: 'Documentation',
    link: 'https://docs.taskcluster.net',
    icon: 'book',
    description: 'Visit the documentation site with documentation for all Taskcluster APIs and Pulse exchanges.'
  },
  {
    title: 'GitHub Repository',
    link: 'https://github.com/taskcluster/taskcluster-tools',
    icon: 'github',
    description: `Go to the source code repository for these tools. This site is completely static
      and you can implement any changes and run it locally, or push it to any static site hosting.`
  },
  {
    title: 'Bugzilla Product',
    link: 'https://bugzilla.mozilla.org/buglist.cgi?product=Taskcluster&bug_status=__open__',
    icon: 'bug',
    description: `Visit the Taskcluster Bugzilla product to view open bugs, participate in
      discussions or report new bugs in Taskcluster.`
  },
  {
    title: 'Status',
    link: '/status',
    icon: 'cogs',
    description: 'Display the status of Taskcluster services and underlying services Taskcluster depends on.'
  },
  {
    title: 'Diagnostics',
    link: '/diagnostics',
    icon: 'cogs',
    description: 'Display results from diagnostics tests.'
  }
];
