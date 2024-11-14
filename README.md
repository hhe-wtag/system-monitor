# System Monitor
### This is a basic system monitor app using node.js for practicing core modules of node.js.

### The features of this project:

Real-Time Monitoring
- WebSocket connection for live data updates
- Connection status indicator (Connected/Disconnected/Error)
- Automatic data refresh without page reload

CPU Monitoring

- Bar chart showing usage for each CPU core
- Individual core usage statistics


Memory Monitoring

- Line chart showing memory usage over time
- Total memory available
- Used memory (with percentage)
- Free memory

Process Management

- Table of top running processes
- Information for each process: Process ID (PID), Command/Application name, CPU usage &Memory usage


Network Information

- List of all network interfaces: Interface name, IP addresses, Address family (IPv4/IPv6), Internal/External status

### Modules used
- http
- fs
- os
- path
- ws
- child_process
