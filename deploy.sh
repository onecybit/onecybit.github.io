#!/bin/bash

# Build the site
hugo

# Commit the changes
git add .
git commit -m "Deploy update"

# Push changes to the main branch
git push origin main

# Deploy to gh-pages branch
git subtree push --prefix=public origin gh-pages
