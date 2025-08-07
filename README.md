# Argo Service Mesh Architecture

This repository contains the configuration for a Kubernetes-based microservice architecture using Argo CD for GitOps deployment and Istio for service mesh capabilities.

## Architecture Overview

```
+-----------------------------------------------------------+
|                  KUBERNETES CLUSTER                        |
|  +---------------------+   +--------------------------+    |
|  |      ARGO CD        |   |  YO-ISTIO-INGRESS   |    |
|  |                     |   |                          |    |
|  | +---------------+   |   | +----------------------+ |    |
|  | |   Argo CD     |   |   | | Istio Ingress        | |    |
|  | |  Controller   |   |   | |    Gateway           | |    |
|  | +---------------+   |   | | (Pod ports: 8080/8443)| |    |
|  |         |           |   | +----------------------+ |    |
|  | +---------------+   |   |           ^              |    |
|  | |     Argo      |---+---+--+        |              |    |
|  | |  Application  |   |   |  |        |              |    |
|  | +---------------+   |   |  |        |              |    |
|  |         |           |   |  |        |              |    |
|  +---------|-----------+   |  |        |              |    |
|            |               | +----------------------+ |    |
|            |               | | Service:             | |    |
|            |               | | istio-ingressgateway | |    |
|            |               | | ports: 80→8080       | |    |
|            |               | |        443→8443      | |    |
|            |               | +----------------------+ |    |
|            |               |           ^              |    |
|            |               | +----------------------+ |    |
|            |               | | ServiceAccount       | |    |
|            |               | | RoleBinding          | |    |
|            |               | | Sidecar Config       | |    |
|            |               | | Telemetry Config     | |    |
|            |               | +----------------------+ |    |
|            |               +-----------|-------------+    |
|            |                           |                  |
|            |                           | HTTP/HTTPS (80/443)
|            |                           v                  |
|            |               +---------------------------+  |
|            |               |   YO-DEVELOPMENT          |  |
|            |               |                           |  |
|            |               | +----------------------+  |  |
|            +--------------->| Frontend Applications  |  |  |
|            |               | | (Service: frontend-   |  |  |
|            |               | | app, Port: 80)   |  |  |
|            |               | +----------|-----------+  |  |
|            |               |            |              |  |
|            |               |            | HTTP/gRPC    |  |
|            |               |            | (Port: 5000) |  |
|            |               |            v              |  |
|            |               | +----------------------+  |  |
|            +--------------->| Backend Applications   |  |  |
|                            | | (Service: backend-    |  |  |
|                            | | app, Port: 5000) |  |  |
|                            | +----------------------+  |  |
|                            |                           |  |
|                            | +----------------------+  |  |
|                            | | Sidecar Config       |  |  |
|                            | | - intercepts all     |  |  |
|                            | |   inbound/outbound   |  |  |
|                            | +----------------------+  |  |
|                            |                           |  |
|                            | +----------------------+  |  |
|                            | | PeerAuth (mTLS)      |  |  |
|                            | | - enforces TLS       |  |  |
|                            | |   on all traffic     |  |  |
|                            | +----------------------+  |  |
|                            |                           |  |
|                            | +----------------------+  |  |
|                            | | AuthPolicy           |  |  |
|                            | | - default deny-all   |  |  |
|                            | +----------------------+  |  |
|                            +---------------------------+  |
+-----------------------------------------------------------+
         ^
         |
+------------------+        +------------------+
|    GitHub        |        |   External       |
|   Repository     |        |    Traffic       |
+------------------+        +------------------+

KEY INTERACTIONS:
1. GitHub Repository → Argo CD (source)
2. Argo CD Controller → Argo Application (manages)
3. Argo Application → Ingress, Frontend & Backend components (deploys/configures)
4. External Traffic → Istio Ingress Gateway (HTTP/HTTPS)
5. Istio Ingress Gateway → Frontend Applications (STRICT mTLS)
6. Frontend Applications → Backend Applications (STRICT mTLS)

PORT DETAILS:
- External traffic: 80/443 (HTTP/HTTPS)
- Istio Ingress Gateway: 80→8080, 443→8443
- Frontend Applications: Service port 80, targetPort 80 (frontend-app)
- Backend Applications: Service port 5000, targetPort 5000 (backend-app)
- All internal communications use mTLS for encryption

SECURITY FEATURES:
- Mutual TLS (mTLS) encryption between services
- Restrictive egress traffic policy (REGISTRY_ONLY)
- Default deny-all authorization policy
- Service account with specific RBAC permissions
```

## Components

### 1. Argo CD

Argo CD is a GitOps continuous delivery tool for Kubernetes that automates the deployment of applications.

- **Argo CD Controller**: Monitors Git repositories for changes and ensures the actual state in the cluster matches the desired state in Git
- **Argo Application**: Custom resources that define what applications to deploy and how to deploy them

### 2. Istio Service Mesh

Istio provides traffic management, security, and observability features for our microservices.

#### Istio Ingress Gateway

- **Namespace**: `yo-istio-ingress`
- **Service**: `istio-ingressgateway`
- **Ports**: 
  - 80 → 8080 (HTTP)
  - 443 → 8443 (HTTPS)
- **Function**: Acts as the entry point for all external traffic, handles routing to internal services

#### Istio Sidecar Injector

The sidecar injector automatically injects Envoy proxy containers into application pods, which:
- Intercepts all inbound and outbound traffic
- Provides metrics, logs, and traces
- Enforces security policies
- Enables TLS encryption

### 3. Applications

#### Frontend Application

- **Namespace**: `yo-development`
- **Service**: `frontend-app`
- **Port**: 80
- **Function**: Serves the user interface

#### Backend Application

- **Namespace**: `yo-development`
- **Service**: `backend-app`
- **Port**: 5000
- **Function**: Provides API endpoints and business logic

### 4. Security Features

#### Mutual TLS (mTLS)

- **PeerAuthentication**: Enforces STRICT mTLS between services
- **Benefits**:
  - Encrypts all service-to-service communication
  - Provides strong identity for each service
  - Prevents unauthorized access

#### Authorization Policies

- **Default Policy**: Deny-all
- **Custom Rules**: Specific rules to allow necessary traffic
- **Function**: Granularly controls which services can communicate with each other

#### Service Accounts and RBAC

- Each component has its dedicated service account
- Role-based access control limits what each service can do within the cluster
- Prevents privilege escalation

#### Egress Traffic Control

- **Mode**: REGISTRY_ONLY
- **Function**: Only allows outbound traffic to registered external services, preventing data exfiltration

## Installation Guide

### Prerequisites

- Kubernetes cluster up and running
- `kubectl` CLI tool installed
- Homebrew installed (for macOS users)
- Git CLI tool installed

### 1. Installing Argo CD

Deploy Argo CD to your Kubernetes cluster:

```bash
# Create the argocd namespace if it doesn't exist
kubectl create namespace argocd

# Install Argo CD components
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Access the Argo CD UI:

```bash
# Port forward the Argo CD server
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Get the initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
```

You can now access the UI at https://localhost:8080 with username `admin` and the password retrieved above.

### 2. Installing Istio

Install the Istio CLI and deploy Istio components:

```bash
# Install istioctl using Homebrew
brew install istioctl

# Install Istio with the demo profile
istioctl install --set profile=demo -y

# Enable Istio sidecar injection in the default namespace
kubectl label namespace default istio-injection=enabled

```
### 3. Installing Monitoring Tools

Deploy Kiali dashboard for service mesh visualization:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.26/samples/addons/kiali.yaml
```

Deploy Grafana for metrics visualization:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml
```

Access the dashboards:

```bash
# Kiali dashboard
kubectl port-forward svc/kiali -n istio-system 20001:20001

# Grafana dashboard
kubectl port-forward svc/grafana -n istio-system 3000:3000
```

Access Kiali at http://localhost:20001 and Grafana at http://localhost:3000.

## Setup and Configuration

### Deployment

1. Apply the Argo CD application manifest:
   ```
   kubectl apply -f argocd/applications.yaml
   ```

2. Argo CD will automatically sync and deploy all components:
   - Istio configurations
   - Security policies
   - Frontend and backend applications

### Monitoring

- Access Argo CD dashboard to view deployment status
- Use Kiali dashboard to visualize service mesh topology
- Check Prometheus and Grafana for metrics and dashboards

## Troubleshooting

Common issues and solutions:

1. **mTLS Issues**: Check PeerAuthentication policies and ensure certificates are valid
2. **Authorization Failures**: Review AuthorizationPolicy resources and ensure proper permissions
3. **Traffic Routing Problems**: Verify VirtualService and DestinationRule configurations

## Additional Resources

- [Argo CD Documentation](https://argo-cd.readthedocs.io/)
- [Istio Documentation](https://istio.io/latest/docs/)
- [Kubernetes Documentation](https://kubernetes.io/docs/home/)
