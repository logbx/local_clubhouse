#!/bin/bash

# Increase file descriptor limits
ulimit -n 65536

# Start expo web server
npx expo start --web --clear