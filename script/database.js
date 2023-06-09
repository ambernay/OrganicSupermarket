import app from './firebase-config.js';

import {
  getDatabase,
  ref,
  set,
  onValue,
  get,
  push,
  remove,
  update,
} from 'https://www.gstatic.com/firebasejs/9.19.1/firebase-database.js';

const onInventoryPage = document.title === 'Organic Home';

const myDatabase = getDatabase(app);
const cartRef = ref(myDatabase, '/cart');
const inventoryRef = ref(myDatabase, '/inventory');

// creating a function to add to database
const addToDatabase = (key, value) => {
  const customRef = ref(myDatabase, key);
  set(customRef, value);
};

// Importing data from Firebase
if (onInventoryPage) {
  onValue(inventoryRef, function (snapshot) {
    const ourData = snapshot.val();
    // storing the data in inventory variable
    const inventory = ourData;
    displayItems(inventory);
  });
}

// Function to Display the items on the page
const productGallery = document.querySelector('.inventory');

export const displayItems = (stock) => {
  productGallery.innerHTML = '';

  stock.forEach((item) => {
    const newListItem = document.createElement('li');
    newListItem.innerHTML = `
    <img
        src= ${item.src}
        alt="Image of ${item.productName}"
      />
      <div class="text-container">
        <div class="info-container">
          <h4>${item.productName}</h4>
          <p>
            Lorem ipsum dolor sit amet consectetur adipisicing elit.
          </p>
          <p class="price">$${item.price}</p>
        </div>
        <!-- Cart Button -->
        <div class="link-container product-link">
          <button tabindex="0" dataindex="${item.id}">Add To Cart</button>
        </div>
      </div>
    `;
    productGallery.appendChild(newListItem);
  });
};

if (onInventoryPage) {
  productGallery.addEventListener('click', function (e) {
    // get parent list item from child button
    if (e.target.tagName === 'BUTTON') {
      const chosenProductIndex = e.target.attributes.dataindex.value;
      const selectedProductRef = ref(
        myDatabase,
        `/inventory/${chosenProductIndex}`
      );

      get(selectedProductRef).then((snapshot) => {
        const productData = snapshot.val();

        getCartItemByProductId(productData.id).then((cartItemKey) => {
          if (cartItemKey) {
            incrementOrDecrementCartItem(cartItemKey, 1);
          } else {
            push(cartRef, productData);
          }
        });
      });
    }
  });
}

const getCartItemByProductId = (productId) => {
  return get(cartRef).then((snapshot) => {
    const cartData = snapshot.val();
    for (let key in cartData) {
      if (cartData[key].id === productId) {
        return key;
      }
    }
    return false;
  });
};

onValue(cartRef, function (snapshot) {
  const cartData = snapshot.val();

  updateCart(cartData);
});

const updateCart = (cartData) => {
  const cartDropdownList = document.querySelector('.cart-dropdown ul');
  const emptyCartMessage = document.querySelector('.empty-cart-message');

  cartDropdownList.innerHTML = '';

  // removes empty cart message when cart exists and contains items

  if (cartData && Object.keys(cartData).length > 0) {
    emptyCartMessage.classList.add('make-invisible');
  }
  // adds empty cart message back when when cart is empty
  else {
    emptyCartMessage.classList.remove('make-invisible');
    // passes 0 values to cart total qty and price
    updateCartTotals(0, 0);
  }
  // for cart totals
  const qtyArray = [];
  const costArray = [];

  let listItemIndex = 0;

  for (let key in cartData) {
    const newCartItem = document.createElement('li');

    newCartItem.classList.add('full-cart');
    const cartItem = cartData[key];

    const uniqueId = Object.keys(cartData)[listItemIndex];
    listItemIndex += 1;

    newCartItem.innerHTML = `
      <div class="arrows" id=${uniqueId}>
          <image class="arrows up" src="./organic-project/assets/icons/chevron-up-outline.svg" alt="up arrow"></image>
          <p>${cartItem.qty}</p>
          <img class="arrows down" src="./organic-project/assets/icons/chevron-down-outline.svg" alt="down arrow">
      </div>
      <img class="product-image" src=${cartItem.src} alt=${cartItem.alt}/>
      <div class="cart-dropdown-info-container">
          <h4>${cartItem.productName}</h4>
          <p class="price">\$${cartItem.price}</p>
      </div>
      <button id=${uniqueId} class="cart-x">
          <div class="lines a"></div>
          <div class="lines b"></div>
      </button>
    `;
    cartDropdownList.append(newCartItem);

    updateCartTotals(cartData, cartItem, qtyArray, costArray);
  }
};

const updateCartTotals = (cartData, cartItem, qtyArray, costArray) => {
  const cartLength = (Object.keys(cartData).length);

  const cartCounter = document.querySelector('.item-num > p');
  const totalCost = document.querySelector('.total-cost > p');
  const subtotal = document.querySelector('.subtotal').lastElementChild;

  // if cart exists
  if (cartData && cartLength > 0) {

    const quantities = cartItem.qty;
    const prices = parseFloat(cartItem.price);

    qtyArray.push(quantities);
    costArray.push(prices);

    // reduce the arrays of quantities and prices
    const cartItemTotal = qtyArray.reduce((total, num) => {
      return total + num;
    });
    const cartPriceTotal = costArray.reduce((total, num) => {
      return total + num;
    });

    cartCounter.textContent = cartItemTotal;
    totalCost.textContent = '$' + cartPriceTotal.toFixed(2);
    subtotal.textContent = '$' + cartPriceTotal.toFixed(2);
  }
  else {
    console.log(cartLength);
    cartCounter.textContent = 0;
    totalCost.textContent = '$0.00';
    subtotal.textContent = '$0.00';
  }
}
/* #region - cart arrows */

const incrementOrDecrementCartItem = (cartItemId, changeInQty) => {
  const cartItemRef = ref(myDatabase, `/cart/${cartItemId}`);

  get(cartItemRef).then((snapshot) => {
    const cartItemData = snapshot.val();
    const itemBasePrice = parseFloat(cartItemData.base);

    const changeQty = {
      qty: (cartItemData.qty += changeInQty),
      // take base price from and multiply it by quantity
      price: (itemBasePrice * cartItemData.qty).toFixed(2),
    };
    // removes item when reaches zero or else, updates
    if (cartItemData.qty < 1) {
      remove(cartItemRef);
    } else {
      update(cartItemRef, changeQty);
    }
  });
};

const cartArrows = (clickedElement) => {
  const qtyToChangeUniqueKey = clickedElement.parentElement.id;
  // set increase or decrease
  let changeInQty = 0;
  if (clickedElement.classList[1] === 'up') {
    changeInQty = 1;
  } else if (clickedElement.classList[1] === 'down') {
    changeInQty = -1;
  }
  // send unique key of clicked element and change direction
  incrementOrDecrementCartItem(qtyToChangeUniqueKey, changeInQty);
};
/* #endregion - cart arrows */

/* #region - cart item removal */
const cartDropdownList = document.querySelector('.cart-dropdown-list');

const removeCartItem = (clickedElement) => {
  // gets parent div IF child is clicked
  clickedElement = clickedElement.closest('.cart-x');
  const nodeToDelete = ref(myDatabase, `/cart/${clickedElement.id}`);

  remove(nodeToDelete);
};

const manageCartButtons = (e) => {
  let clickedElement = e.target;
  // if X button or child of X button is clicked
  if (
    clickedElement.className === 'cart-x' ||
    clickedElement.parentElement.className === 'cart-x'
  ) {
    // function to remove item
    removeCartItem(clickedElement);
  }
  // gets first className of arrow element
  else if (clickedElement.classList[0] === 'arrows') {
    // function to change item quantity
    cartArrows(clickedElement);
  }
};

cartDropdownList.addEventListener('click', manageCartButtons);

/* #endregion - cart item removal */

// Search bar implementation

const btnSearch = document.querySelector('.product__search');
const searchInput = document.querySelector('[data-search]');
const resetInput = document.querySelector('.product__reset');

// search function
const searchFunction = (stock, value) => {
  let counter = 0;
  productGallery.innerHTML = '';
  stock.forEach((item, i) => {
    if (item.productName.toLowerCase().includes(value.trim().toLowerCase())) {
      const newListItem = document.createElement('li');
      newListItem.innerHTML = `
      <div class="product__box">
      <img
          src= ${stock[i].src}
          alt="Image of ${stock[i].productName}"
        />
        <div class="text-container">
          <div class="info-container">
            <h4>${stock[i].productName}</h4>
            <p>
              Lorem ipsum dolor sit amet consectetur adipisicing elit.
            </p>
            <p class="price">$${stock[i].price}</p>
          </div>
          <!-- Cart Button -->
          <div class="link-container product-link">
            <button tabindex="0" dataindex="${stock[i].id}">Add To Cart</button>
          </div>
        </div>
        </div>
      `;
      productGallery.appendChild(newListItem);
      counter++;
    }
  });
  if (counter === 0) {
    const newListItem = document.createElement('li');
    newListItem.innerHTML = `<h2>Sorry Product not found. Try again ! </h2>`;
    productGallery.appendChild(newListItem);
  }
};

// intitiates the event by getting the snapshot from firebase
if (onInventoryPage) {
  btnSearch.addEventListener('click', function (e) {
    e.preventDefault();
    // extracting search input value
    const value = searchInput.value;

    get(inventoryRef).then((snapshot) => {
      const stock = snapshot.val();
      // sending the stock and search value to the search function
      searchFunction(stock, value);
    });
    // clearing the input field
    searchInput.value = '';
  });
}

if (onInventoryPage) {
  resetInput.addEventListener('click', function (e) {
    e.preventDefault();

    get(inventoryRef).then((snapshot) => {
      const stock = snapshot.val();
      // using displayItems function to reset
      displayItems(stock);
    });
    // clearing the input field
    searchInput.value = '';
    btnFilter.value = 'default';
  });
}

// filter the Product Section
const btnFilter = document.querySelector('#filter');
if (onInventoryPage) {
  // resetting the filter at every refresh
  btnFilter.value = 'default';
}

// price up function
const priceUp = (stock) => {
  stock.sort(function (a, b) {
    return b.price - a.price;
  });
  displayItems(stock);
};

// price up function
const priceDown = (stock) => {
  stock.sort(function (a, b) {
    return a.price - b.price;
  });
  displayItems(stock);
};

// bestselling function
const bestSelling = (stock) => {
  stock.sort(function (a, b) {
    return Math.random() - 0.5;
  });

  displayItems(stock);
};

if (onInventoryPage) {
  btnFilter.addEventListener('change', function () {
    const value = this.value;

    get(inventoryRef).then((snapshot) => {
      const stock = snapshot.val();
      // sending the stock and search value to the search function
      if (value === 'price-up') {
        priceUp(stock);
      } else if (value === 'price-down') {
        priceDown(stock);
      } else if (value === 'bestselling') {
        bestSelling(stock);
      } else {
        displayItems(stock);
      }
    });
  });
}
