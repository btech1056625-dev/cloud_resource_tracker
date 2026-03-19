document.addEventListener('DOMContentLoaded', function () {
    // Get current page
    const currentPath = window.location.pathname.toLowerCase();
    const isLandingPage = currentPath.includes('index.html') || currentPath === '/' || currentPath === '';
    const isSignupPage = currentPath.includes('signup.html');
    
    // Only enforce auth on protected pages (not landing or signup)
    if (!isLandingPage && !isSignupPage) {
        // Use validateSessionOrRedirect from auth.js to check expiration
        if (!validateSessionOrRedirect()) {
            return; // Redirect already happened
        }
    }
    
    // Initialize Charts if on Dashboard
    const ctx = document.getElementById('costChart');
    if (ctx) {
        loadDashboardData();
    }

    // Initialize Resources Table if on Resources page
    if (window.location.pathname.includes('view_resources.html')) {
        loadResourcesTable();
    }

    // Handle Active Nav Link
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath || (currentPath === '' && href === 'dashboard.html')) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Form Submissions
    const addResourceForm = document.getElementById('addResourceForm');
    if (addResourceForm) {
        addResourceForm.addEventListener('submit', handleAddResource);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                logout();
            }
        });
    }
});

/**
 * Handle add resource form submission with validation
 */
async function handleAddResource(e) {
    e.preventDefault();
    
    try {
        const form = e.target;
        const formData = new FormData(form);
        
        // Validate and collect data
        const resourceName = formData.get('resourceName')?.trim();
        const serviceType = formData.get('resourceType')?.trim();
        const provider = formData.get('provider')?.trim();
        const costStr = formData.get('cost')?.trim();
        
        if (!resourceName) {
            alert('❌ Resource name is required');
            return;
        }
        
        if (!serviceType) {
            alert('❌ Service type is required');
            return;
        }
        
        if (!provider) {
            alert('❌ Provider is required');
            return;
        }
        
        const cost = parseFloat(costStr);
        if (isNaN(cost) || cost < 0) {
            alert('❌ Cost must be a valid positive number');
            return;
        }
        
        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';
        
        const resourceData = {
            resource_name: resourceName,
            service_type: serviceType,
            provider: provider,
            monthly_cost: cost
        };

        const result = await addResource(resourceData);
        
        if (result && result.success) {
            alert('✅ Resource added successfully!');
            form.reset();
            // Redirect after short delay
            setTimeout(() => {
                window.location.href = '/view_resources.html';
            }, 500);
        } else {
            alert('❌ Failed to add resource: ' + (result?.message || 'Unknown error'));
        }
        
    } catch (error) {
        console.error('Error in handleAddResource:', error);
        alert('❌ An error occurred: ' + error.message);
    } finally {
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Resource';
    }
}

async function loadDashboardData() {
    try {
        console.log("Loading dashboard data...");
        
        // Get summary stats
        const summary = await getStatusSummary();
        
        // Update dashboard cards
        if (summary && summary.success) {
            const totalResources = summary.totalResources || 0;
            const totalCost = parseFloat(summary.totalCost || 0);
            const activeResources = summary.activeResources || 0;
            const criticalAlerts = summary.criticalAlerts || 0;
            
            const totalResourcesEl = document.getElementById('totalResources');
            if (totalResourcesEl) totalResourcesEl.textContent = totalResources;
            
            const monthlySpendEl = document.getElementById('monthlySpend');
            if (monthlySpendEl) monthlySpendEl.textContent = '$' + totalCost.toFixed(2);
            
            const activeInstancesEl = document.getElementById('activeInstances');
            if (activeInstancesEl) activeInstancesEl.textContent = activeResources;
            
            const criticalAlertsEl = document.getElementById('criticalAlerts');
            if (criticalAlertsEl) criticalAlertsEl.textContent = criticalAlerts;
            
            // Update change indicators
            const resourcesChangeEl = document.getElementById('resourcesChange');
            if (resourcesChangeEl) {
                resourcesChangeEl.innerHTML = '<i class="fas fa-arrow-up"></i> ' + (summary.resourceChange || '0%') + ' from last month';
            }
            
            const spendChangeEl = document.getElementById('spendChange');
            if (spendChangeEl) {
                spendChangeEl.innerHTML = '<i class="fas fa-arrow-up"></i> ' + (summary.spendChange || '0%') + ' from last month';
            }
        } else {
            console.error("Failed to load summary:", summary?.message);
        }
        
        // Get cost by service for chart
        const costData = await getCostByService();
        
        // Initialize chart with data
        const ctx = document.getElementById('costChart');
        if (ctx && costData && costData.success && Array.isArray(costData.data) && costData.data.length > 0) {
            const labels = costData.data.map(item => item.service || 'Unknown');
            const amounts = costData.data.map(item => {
                const amt = parseFloat(item.amount || 0);
                return isNaN(amt) ? 0 : amt;
            });
            
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels.slice(0, 6),
                    datasets: [{
                        label: 'Monthly Spend ($)',
                        data: amounts.slice(0, 6),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: '#3b82f6'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: '#1e293b',
                            titleColor: '#f8fafc',
                            bodyColor: '#f8fafc',
                            padding: 12,
                            cornerRadius: 10,
                            displayColors: false
                        }
                    },
                    scales: {
                        y: {
                            grid: {
                                color: 'rgba(255, 255, 255, 0.05)'
                            },
                            ticks: {
                                color: '#94a3b8',
                                font: { size: 12 },
                                callback: function (value) { return '$' + value; }
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#94a3b8',
                                font: { size: 12 }
                            }
                        }
                    }
                }
            });
        } else {
            console.warn("No cost data available for chart");
        }
        
        // Load recent activity
        const resources = await getResources();
        if (resources && resources.success && Array.isArray(resources.data)) {
            const activityList = document.getElementById('recentActivityList');
            if (activityList) {
                activityList.innerHTML = '';
                
                if (resources.data.length === 0) {
                    activityList.innerHTML = '<li style="padding: 1rem; text-align: center; color: #94a3b8;">No recent activity</li>';
                } else {
                    const recent = resources.data.slice(0, 3);
                    recent.forEach(resource => {
                        const li = document.createElement('li');
                        li.style.cssText = 'padding: 0.75rem 0; border-bottom: 1px solid var(--glass-border); display: flex; align-items: center; gap: 1rem;';
                        
                        const colorMap = {
                            'active': '#4ade80',
                            'running': '#4ade80',
                            'warning': '#fbbf24',
                            'failed': '#f87171'
                        };
                        
                        const status = (resource.status || 'unknown').toLowerCase();
                        const color = colorMap[status] || '#4ade80';
                        
                        try {
                            const createdDate = new Date(resource.created_at);
                            const dateStr = isNaN(createdDate.getTime()) 
                                ? 'Unknown date' 
                                : createdDate.toLocaleString();
                            
                            li.innerHTML = `
                                <div style="width: 10px; height: 10px; border-radius: 50%; background: ${color}; flex-shrink: 0;"></div>
                                <div style="flex: 1;">
                                    <p style="font-size: 0.875rem; margin: 0;">${escapeHtml(resource.resource_name)} (${escapeHtml(resource.service_type)})</p>
                                    <small style="color: var(--text-secondary)">${dateStr}</small>
                                </div>
                            `;
                        } catch (e) {
                            console.error("Error rendering activity item:", e);
                            li.innerHTML = `<p style="color: #f87171;">Error displaying activity</p>`;
                        }
                        
                        activityList.appendChild(li);
                    });
                }
            }
        } else {
            console.error("Failed to load resources:", resources?.message);
        }
        
    } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        alert('Failed to load dashboard data: ' + error.message);
    }
}

async function loadResourcesTable() {
    try {
        const resourcesTable = document.querySelector('table tbody');
        if (!resourcesTable) return;

        // Show loading state
        resourcesTable.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #94a3b8;">Loading resources...</td></tr>';

        const data = await getResources();
        
        if (data && data.success && Array.isArray(data.data)) {
            resourcesTable.innerHTML = '';
            
            if (data.data.length === 0) {
                resourcesTable.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #94a3b8;">No resources found. <a href="/add_resource.html" style="color: #3b82f6; text-decoration: underline;">Add one now</a></td></tr>';
                return;
            }

            data.data.forEach((resource, index) => {
                try {
                    const tr = document.createElement('tr');
                    
                    const status = (resource.status || 'unknown').toLowerCase();
                    const statusClass = 
                        status === 'active' || status === 'running' ? 'status-active' : 
                        status === 'pending' ? 'status-pending' : 'status-terminated';

                    const cost = parseFloat(resource.monthly_cost || 0);
                    const costStr = isNaN(cost) ? 'N/A' : '$' + cost.toFixed(2);

                    tr.innerHTML = `
                        <td><strong>${escapeHtml(resource.resource_name)}</strong></td>
                        <td>${escapeHtml(resource.service_type)}</td>
                        <td>${escapeHtml(resource.provider || 'AWS')}</td>
                        <td>${costStr}</td>
                        <td><span class="status-badge ${statusClass}">${escapeHtml(resource.status)}</span></td>
                        <td>
                            <button class="btn" style="padding: 0.3rem 0.6rem; background: rgba(255,255,255,0.05);" title="Edit resource"><i class="fas fa-edit"></i></button>
                            <button class="btn delete-btn" data-resource-id="${escapeHtml(resource.resource_id)}" style="padding: 0.3rem 0.6rem; background: rgba(255,255,255,0.05); color: #f87171;" title="Delete resource"><i class="fas fa-trash"></i></button>
                        </td>
                    `;
                    
                    // Add event listener to delete button
                    const deleteBtn = tr.querySelector('.delete-btn');
                    deleteBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        const resourceId = this.getAttribute('data-resource-id');
                        handleDelete(resourceId);
                    });
                    
                    resourcesTable.appendChild(tr);
                } catch (e) {
                    console.error("Error rendering resource row:", e);
                }
            });
        } else {
            resourcesTable.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #f87171;">Failed to load resources: ' + escapeHtml(data?.message || 'Unknown error') + '</td></tr>';
        }
    } catch (error) {
        console.error('❌ Error loading resources table:', error);
        const resourcesTable = document.querySelector('table tbody');
        if (resourcesTable) {
            resourcesTable.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #f87171;">Error: ' + escapeHtml(error.message) + '</td></tr>';
        }
    }
}

/**
 * Handle resource deletion with confirmation
 */
async function handleDelete(resourceId) {
    if (!confirm('Are you sure you want to delete this resource? This action cannot be undone.')) {
        return;
    }
    
    try {
        const result = await deleteResource(resourceId);
        if (result && result.success) {
            alert('✅ Resource deleted successfully!');
            loadResourcesTable();
        } else {
            alert('❌ Failed to delete resource: ' + (result?.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error deleting resource:', error);
        alert('❌ Error: ' + error.message);
    }
}

/**
 * Escape HTML to prevent XSS attacks
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
