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

## Traffic Flow

1. **External → Ingress**:
   - External traffic arrives at the Istio Ingress Gateway on ports 80/443
   - TLS termination happens at the gateway (for HTTPS)

2. **Ingress → Frontend**:
   - Traffic is routed to the frontend service on port 80
   - Communication is secured with mTLS
   - Authorization policies verify access is allowed

3. **Frontend → Backend**:
   - Frontend communicates with backend on port 5000
   - All traffic is secured with mTLS
   - Sidecar proxies handle retries, timeouts, and circuit breaking

## Setup and Configuration

### Prerequisites

- Kubernetes cluster
- Istio installed
- Argo CD installed
- Kubectl and Git CLI tools

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
