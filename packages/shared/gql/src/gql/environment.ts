import { gql } from '@apollo/client';

export const getUserEnvironments = gql`
  query userEnvironments($projectId: String!) {
    userEnvironments(projectId: $projectId) {
      id
      name
      token
      createdAt
      launcherFocusTrap
      launcherTabWindowMs
      launcherHoldFocusMs
      launcherMaxHoldCount
    }
  }
`;

export const createEnvironments = gql`
  mutation createEnvironments($name: String!, $projectId: String!) {
    createEnvironments(data: { name: $name, projectId: $projectId }) {
      id
      name
      token
    }
  }
`;

export const updateEnvironments = gql`
  mutation updateEnvironments($id: String!, $name: String!) {
    updateEnvironments(data: { id: $id, name: $name }) {
      id
      name
      token
    }
  }
`;

export const updateEnvironmentLauncherFocus = gql`
  mutation updateEnvironmentLauncherFocus(
    $id: String!
    $trap: String!
    $tabWindowMs: Int
    $holdFocusMs: Int
    $maxHoldCount: Int
  ) {
    updateEnvironmentLauncherFocus(
      data: {
        id: $id
        trap: $trap
        tabWindowMs: $tabWindowMs
        holdFocusMs: $holdFocusMs
        maxHoldCount: $maxHoldCount
      }
    ) {
      id
      launcherFocusTrap
      launcherTabWindowMs
      launcherHoldFocusMs
      launcherMaxHoldCount
    }
  }
`;

export const deleteEnvironments = gql`
  mutation deleteEnvironments($id: String!) {
    deleteEnvironments(data: { id: $id }) {
      id
    }
  }
`;
