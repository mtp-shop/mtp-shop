checkoutBtn.addEventListener('click', async function() {
            const btn = this;
            const originalText = btn.innerHTML;
            
            if(cart.length === 0) { alert("Cart is empty."); return; }

            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSING...';
            btn.style.opacity = "0.8";
            btn.style.pointerEvents = "none";

            // SAVE PENDING ORDER
            localStorage.setItem('mtpPendingOrder', JSON.stringify(cart));

            // --- CALCULATE DISCOUNT CODE TO SEND ---
            let codeToSend = activeCode; // Default to manual code

            // If no manual code, check for bundle conditions
            if (!codeToSend) {
                // 1. Calculate Subtotal
                let subtotal = 0;
                cart.forEach(item => {
                    let p = parseFloat(item.price.replace('£', '').replace('+', ''));
                    if(!isNaN(p)) subtotal += p * item.qty;
                });

                // 2. Check Categories
                let hasIntro = cart.some(i => i.title.toLowerCase().includes('intro'));
                let hasChain = cart.some(i => i.title.toLowerCase().includes('chain'));
                let hasGFX = cart.some(i => i.title.toLowerCase().includes('gfx') || i.title.toLowerCase().includes('banner'));
                let hasCloth = cart.some(i => i.title.toLowerCase().includes('cloth') || i.title.toLowerCase().includes('pack'));

                let categoryCount = 0;
                if(hasIntro) categoryCount++;
                if(hasChain) categoryCount++;
                if(hasGFX) categoryCount++;
                if(hasCloth) categoryCount++;

                // 3. Set code if conditions met
                if (categoryCount >= 3 || subtotal > 35) {
                    codeToSend = "BUNDLE25";
                }
            }
            // ----------------------------------------

            try {
                // SIMULATE SAVING ORDER TO USER ACCOUNT (MOCK DB)
                const currentUser = JSON.parse(localStorage.getItem('tps_current_user'));
                if(currentUser) {
                    const usersDB = JSON.parse(localStorage.getItem('tps_users_db')) || [];
                    const userIndex = usersDB.findIndex(u => u.email === currentUser.email);
                    
                    if(userIndex > -1) {
                        const newOrder = {
                            id: Math.floor(Math.random() * 90000) + 10000,
                            date: new Date().toLocaleDateString(),
                            count: cart.length,
                            total: totalEl.innerText,
                            items: cart 
                        };
                        
                        // Save to DB and Current User Session
                        usersDB[userIndex].orders.unshift(newOrder);
                        currentUser.orders.unshift(newOrder);
                        
                        localStorage.setItem('tps_users_db', JSON.stringify(usersDB));
                        localStorage.setItem('tps_current_user', JSON.stringify(currentUser));
                    }
                }

                const response = await fetch('/api/create-checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        cart: cart,
                        discountCode: codeToSend // SEND THE CALCULATED CODE
                    }),
                });

                const data = await response.json();

                if (data.error) { throw new Error(data.error); }

                if (data.bypassUrl) {
                    localStorage.removeItem('mtpCart');
                    window.location.href = data.bypassUrl;
                } 
                else if (data.id) {
                    const result = await stripe.redirectToCheckout({ sessionId: data.id });
                    if (result.error) { alert(result.error.message); resetBtn(); }
                }

            } catch (error) {
                console.error('Error:', error);
                alert("Checkout Error: " + error.message);
                resetBtn();
            }

            function resetBtn() {
                btn.innerHTML = originalText;
                btn.style.opacity = "1";
                btn.style.pointerEvents = "all";
            }
        });
