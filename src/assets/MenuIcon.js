import React from "react";
import styled from "styled-components";

const Icon = styled.svg`
  width: 24px;
  height: 24px;
  transition: transform 0.3s ease-in-out;
  cursor: pointer;

  .line {
    transition: transform 0.3s ease-in-out, opacity 0.3s ease-in-out;
    transform-origin: center;
  }

  &.open {
    .line1 {
      transform: rotate(45deg) translate(0px, 5px);
    }
    .line2 {
      opacity: 0;
    }
    .line3 {
      transform: rotate(-45deg) translate(-5px, -5px);
    }
  }
`;

const MenuIcon = ({ open }) => {
  return (
    <Icon
      className={open ? "open" : ""}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        className="line line1"
        d="M3 12H21"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className="line line2"
        d="M3 6H21"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className="line line3"
        d="M3 18H21"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Icon>
  );
};

export default MenuIcon;
