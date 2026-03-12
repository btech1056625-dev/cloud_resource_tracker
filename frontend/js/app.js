document.addEventListener('DOMContentLoaded', function () {
    // Initialize Charts if on Dashboard
    const ctx = document.getElementById('costChart');
    if (ctx) {
        loadDashboardData();
    }

    // Initialize Resources Table if on Resources page
    const resourcesTable = document.querySelector('table tbody');
    if (window.location.pathname.includes('view_resources.html')) {
        loadResourcesTable();
    }

    // Handle Active Nav Link
    const currentPath = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Form Submissions
    const addResourceForm = document.getElementById('addResourceForm');
    if (addResourceForm) {
        addResourceForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const formData = new FormData(addResourceForm);
            const resourceData = {
                resource_name: formData.get('resourceName'),
                service_type: formData.get('resourceType'),
                provider: formData.get('provider'),
                monthly_cost: parseFloat(formData.get('cost'))
            };

            const result = await addResource(resourceData);
            if (result && result.success) {
                alert('Resource Added Successfully!');
                window.location.href = '/view_resources.html';
            } else {
                alert('Failed to add resource: ' + (result?.message || 'Unknown error'));
            }
        });
    }
});

async function loadDashboardData() {
    try {
        // Get summary stats
        const summaryResponse = await fetch(API_BASE_URL + 'get_summary_status.php', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + getToken()
            }
        });
        
        const summary = await summaryResponse.json();
        
        // Update dashboard cards
        if (summary.success) {
            document.getElementById('totalResources').textContent = summary.totalResources || 0;
            document.getElementById('monthlySpend').textContent = '$' + (summary.totalCost || 0).toFixed(2);
            document.getElementById('activeInstances').textContent = summary.activeResources || 0;
            document.getElementById('criticalAlerts').textContent = summary.criticalAlerts || 0;
            
            // Update change indicators
            document.getElementById('resourcesChange').innerHTML = 
                '<i class="fas fa-arrow-up"></i> ' + (summary.resourceChange || '0%') + ' from last month';
            document.getElementById('spendChange').innerHTML = 
                '<i class="fas fa-arrow-up"></i> ' + (summary.spendChange || '0%') + ' from last month';
        }
        
        // Get cost by service for chart
        const costResponse = await fetch(API_BASE_URL + 'get_cost_by_service.php', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + getToken()
            }
        });
        
        const costData = await costResponse.json();
        
        // Initialize chart with data
        const ctx = document.getElementById('costChart');
        if (ctx && costData.success && costData.data) {
            const labels = costData.data.map(item => item.service);
            const amounts = costData.data.map(item => parseFloat(item.amount));
            
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
        }
        
        // Load recent activity
        const resourceResponse = await fetch(API_BASE_URL + 'get_resource.php', {
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + getToken()
            }
        });
        
        const resources = await resourceResponse.json();
        if (resources.success && Array.isArray(resources.data)) {
            const activityList = document.getElementById('recentActivityList');
            activityList.innerHTML = '';
            
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
                
                const color = colorMap[resource.status] || '#4ade80';
                
                li.innerHTML = `
                    <div style="width: 10px; height: 10px; border-radius: 50%; background: ${color};"></div>
                    <div>
                        <p style="font-size: 0.875rem;">${resource.resource_name} (${resource.service_type})</p>
                        <small style="color: var(--text-secondary)">${new Date(resource.created_at).toLocaleString()}</small>
                    </div>
                `;
                
                activityList.appendChild(li);
            });
        }
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}
async function loadResourcesTable() {
    try {
        const resourcesTable = document.querySelector('table tbody');
        if (!resourcesTable) return;

        // Show loading state
        resourcesTable.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">Loading resources...</td></tr>';

        const data = await getResources();
        
        if (data.success && Array.isArray(data.data)) {
            resourcesTable.innerHTML = '';
            
            if (data.data.length === 0) {
                resourcesTable.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">No resources found.</td></tr>';
                return;
            }

            data.data.forEach(resource => {
                const tr = document.createElement('tr');
                
                const statusClass = 
                    resource.status.toLowerCase() === 'active' || resource.status.toLowerCase() === 'running' ? 'status-active' : 
                    resource.status.toLowerCase() === 'pending' ? 'status-pending' : 'status-terminated';

                tr.innerHTML = `
                    <td><strong>${resource.resource_name}</strong></td>
                    <td>${resource.service_type}</td>
                    <td>${resource.provider || 'AWS'}</td>
                    <td>$${parseFloat(resource.monthly_cost || 0).toFixed(2)}</td>
                    <td><span class="status-badge ${statusClass}">${resource.status}</span></td>
                    <td>
                        <button class="btn" style="padding: 0.3rem 0.6rem; background: rgba(255,255,255,0.05);"><i class="fas fa-edit"></i></button>
                        <button class="btn" onclick="handleDelete('${resource.resource_id}')" style="padding: 0.3rem 0.6rem; background: rgba(255,255,255,0.05); color: #f87171;"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                resourcesTable.appendChild(tr);
            });
        } else {
            resourcesTable.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #f87171;">Failed to load resources.</td></tr>';
        }
    } catch (error) {
        console.error('Error loading resources table:', error);
    }
}

async function handleDelete(resourceId) {
    if (confirm('Are you sure you want to delete this resource?')) {
        const result = await deleteResource(resourceId);
        if (result && result.success) {
            alert('Resource deleted successfully!');
            loadResourcesTable();
        } else {
            alert('Failed to delete resource: ' + (result?.message || 'Unknown error'));
        }
    }
}
